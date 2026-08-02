# Substrate 시스템 분석 보고서

이 문서는 UE5.8 소스를 직접 조사해서 Substrate가 레거시 쉐이딩 모델 시스템과 무엇이 다른지, 최적화 관점에서 무엇이 좋아졌는지, 모바일 지원 여부, 왜 레거시를 대체하는지를 정리한 문서입니다. (레거시 시스템 자체는 `ShadingModel_System_Study.md` 참조)

## 핵심 요약

Substrate는 "쉐이딩 모델 14개를 enum으로 골라 쓰는 시스템"을 **"Slab이라는 일반화된 재질 + 기능 비트 + 레이어링"**으로 재설계한 것입니다. 성능 관점에서는 "무조건 더 빠름"이 아니라 **"복잡한 만큼만 비용을 내는"** 구조이며, 모바일에서는 클로저 1개짜리 축소판으로 동작합니다. 5.8에서 Experimental 딱지가 떼졌고 신규 프로젝트 기본값이 되었습니다.

## 1. 레거시와의 구조 차이

### 재질 표현

- **레거시**: 픽셀마다 4비트 ID를 GBuffer에 굽고, 라이팅 때 `ShadingModels.ush`의 `IntegrateBxDF()` switch가 14개 하드코딩 함수 중 하나를 고릅니다. 재질 종류 = enum 값 하나입니다.
- **Substrate**: 픽셀 하나가 **클로저(BSDF) 최대 8개**를 레이어링 연산자(Vertical/Horizontal/Weight/Add)로 쌓은 트리를 가질 수 있고, 각 클로저는 enum이 아니라 **기능 비트의 조합**입니다.

BSDF 타입은 7개뿐입니다 (`Engine/Shaders/Shared/SubstrateDefinitions.h`):

```c
#define SUBSTRATE_BSDF_TYPE_SLAB               0   // 거의 전부를 커버
#define SUBSTRATE_BSDF_TYPE_VOLUMETRICFOGCLOUD 1
#define SUBSTRATE_BSDF_TYPE_UNLIT              2
#define SUBSTRATE_BSDF_TYPE_HAIR               3
#define SUBSTRATE_BSDF_TYPE_SINGLELAYERWATER   4
#define SUBSTRATE_BSDF_TYPE_EYE                5
#define SUBSTRATE_BSDF_TYPE_TOON               6   // 이 포크에서 추가
//      SUBSTRATE_BSDF_TYPE_CUSTOM             7   // 커스텀용 예약
```

### 레거시 모델 → Slab 매핑

레거시 쉐이딩 모델 12개는 Slab 하나의 파라미터 변주로 흡수됩니다. 변환 코드는 `Engine/Shaders/Private/Substrate/SubstrateLegacyConversion.ush`입니다.

| 레거시 모델 | Slab에서의 표현 |
|---|---|
| DefaultLit | 그냥 Slab |
| ClearCoat | `SecondRoughness` (2차 스펙큘러 로브) |
| Cloth | `Fuzz` (보풀) |
| Subsurface / TwoSidedFoliage | `SSSType = WRAP / TWO_SIDED_WRAP` |
| SubsurfaceProfile / PreintegratedSkin | `SSSType = DIFFUSION(_PROFILE)` |
| ThinTranslucent | `SSSType = SIMPLEVOLUME` |
| Hair / Eye / SingleLayerWater | 전용 BSDF 타입 유지 |

### 라이팅 평가

`Engine/Shaders/Private/Substrate/SubstrateEvaluation.ush`의 `SubstrateEvaluateBSDFCommon()`이 통합 진입점입니다. 레거시의 14-way switch 대신 **4-way**(SLAB/HAIR/EYE/TOON)이고, SLAB 케이스 하나가 디퓨즈 → GGX 스펙큘러 → 2차 로브(haziness) → SSS → Fuzz를 기능 비트에 따라 순서대로 처리합니다. `DefaultLitBxDF`의 일반화 확장판이라고 보면 됩니다.

출력 구조체 `FSubstrateEvaluateResult`에는 레거시 `FDirectLighting`에 없는 `ThroughputV` / `TransmittanceAlongN`이 있습니다. 클로저가 레이어로 쌓이므로 각 레이어가 아래층으로 얼마나 빛을 통과시키는지를 보고해야 하기 때문입니다. 이것이 구조적 핵심 차이입니다.

### 저장 방식

- **레거시**: 고정 GBufferA/B/C 채널 (~16-24바이트/픽셀).
- **Substrate (Adaptive GBuffer)**: GBufferA/B/C가 **아예 사라지고** (`GBufferInfo.cpp`), `Texture2DArray<uint>` 비트스트림에 픽셀마다 **가변 크기**로 패킹됩니다. 단순 픽셀은 uint 2개(8바이트), 복잡한 픽셀은 예산(`r.Substrate.BytesPerPixel`, 기본 80, 최대 256)까지 커집니다. SSR/SSAO용 노멀+러프니스는 별도의 작은 TopLayer 텍스처에 둬서 비트스트림 디코딩 없이 접근 가능하게 합니다.

16개 제한의 원인이던 "GBuffer의 4비트 칸" 자체가 없어집니다. 대신 한계는 클로저 8개(Lumen의 4비트 오프셋 패킹 때문), 그래프 레벨 쉐이딩모델 32개(`ESubstrateShadingModel`의 32비트 비트필드)로 훨씬 여유가 있습니다.

### 두 가지 GBuffer 모드

| | Blendable GBuffer (`r.Substrate.ProjectGBufferFormat=0`) | Adaptive GBuffer (`=1`) |
|---|---|---|
| 저장 | 레거시 GBuffer 레이아웃 재사용 | 가변 비트스트림 |
| 클로저 | 1개 강제 | 최대 8개 |
| 바이트/픽셀 | 20 고정 | 12~256 가변 |
| 신규 프로젝트 기본 | ✅ | |
| 4비트 ID 체계 | 여전히 사용 | 제거됨 |

Blendable 모드는 "Substrate 라이팅 수식은 쓰되 저장은 레거시 그대로"인 절충안입니다. 멀티 레이어의 진짜 힘은 Adaptive에서만 나옵니다.

## 2. 최적화 — 좋아진 것과 비싸진 것

### 타일 분류 (핵심)

화면을 8×8 타일로 나눠 컴퓨트 셰이더(`SubstrateMaterialClassification.usf`)가 각 타일을 **Simple / Single / Complex / ComplexSpecial**로 분류하고, 라이팅 패스가 타일 종류별로 다른 셰이더 퍼뮤테이션을 디스패치합니다.

```hlsl
// DeferredLightPixelShaders.usf
#if SUBSTRATE_TILETYPE == 0
    #define SUBSTRATE_FASTPATH 1    // Simple: SSS/2차로브/Fuzz/Aniso 코드가 컴파일에서 제거
#elif SUBSTRATE_TILETYPE == 1
    #define SUBSTRATE_SINGLEPATH 1
...
```

런타임 분기가 아니라 **컴파일 타임 제거**라서 단순 타일은 레지스터 사용량과 명령어 수 자체가 줄어듭니다. 디렉셔널 라이트는 타일 단위 indirect draw로, 로컬 라이트는 스텐실 4비트로 컬링합니다. 분류는 비동기 컴퓨트로 그림자 렌더링과 겹쳐 돕니다 (`r.Substrate.AsyncClassification=1`). 소스 곳곳에 `// Substrate 60fps by default` 주석이 있을 만큼 비용 통제에 신경 쓴 흔적이 있습니다.

### 자동 단순화 예산

머티리얼이 픽셀당 바이트 예산을 초과하면 번역기가 그래프를 자동으로 깎아서 예산 안에 맞춥니다 (`SubstrateTranslatorCommon.cpp`의 do-while 단순화 루프). 아티스트가 아무리 쌓아도 GPU 비용 상한이 보장됩니다.

### 메모리 (정직한 비교)

- Adaptive 최악 케이스: 88바이트/픽셀 + TopLayer 4~8바이트 → 레거시(16~24)보다 무겁습니다.
- 단순한 씬: 12~20바이트 수준으로 레거시와 비슷합니다.
- 할당은 grow-only 적응형입니다 (`r.Substrate.AllocationMode=1`) — 씬에 보이는 재질의 요구량만큼만 잡습니다.

**결론: 같은 DefaultLit 씬이라면 Substrate가 더 빨라지는 게 아닙니다. "레이어드 재질을 쓸 때 비용이 통제되는" 시스템입니다.** 그래서 신규 프로젝트 기본값이 메모리 중립인 Blendable 모드입니다.

## 3. 모바일 지원

**돌아가지만 축소판입니다.** 게이트는 `RenderUtils.cpp`의 `IsSubstrateBlendableGBufferEnabled()` 하나 — 모바일 플랫폼은 전부 Blendable GBuffer로 강제됩니다 (`r.Substrate.Mobile` 같은 별도 스위치는 없습니다).

- **클로저 1개, 20바이트/픽셀 고정.** 멀티 레이어는 불가합니다.
- SSS/Fuzz/ClearCoat/Anisotropy 중 **우선순위에 따라 하나만** 살아남고, Glint·Specular Profile·F90·러프 굴절·디스토션·DBuffer 데칼·타일 분류는 없습니다.
- **모바일 포워드**: 진짜 Substrate 라이팅 경로가 있습니다 (`SubstrateMobileForwardLighting.ush`).
- **모바일 디퍼드**: Substrate 데이터를 레거시 GBuffer로 export해서 기존 라이팅 셰이더가 처리합니다. 디퍼드 셰이딩 코드는 Substrate를 모릅니다.
- Android/iOS ini에 Substrate 설정이 전무하고 소스에 모바일 관련 `SUBSTRATE_TODO`가 많습니다. 모바일은 진행형입니다.

## 4. 왜 레거시를 대체하는가

1. **레거시는 조합이 불가능합니다.** "클리어코트 + SSS" 같은 조합은 enum 하나 고르는 구조에선 표현 자체가 안 되고, 새 모델마다 enum + switch + GBuffer 인코딩 + 16슬롯 경쟁을 치러야 합니다. Substrate는 레이어링이 일급 개념이라 그래프에서 슬랩을 쌓으면 끝입니다.
2. **에픽이 방향을 정했습니다.** 레거시 BxDF에 `UE_DEPRECATED 5.7 - Deprecated by Substrate` 주석이 붙었고, 5.8 프로젝트 설정에서 Experimental 문구가 사라졌으며, 신규 프로젝트는 Substrate가 기본으로 켜져 생성됩니다 (`GameProjectUtils.cpp`). MegaLights, 패스 트레이서, 스토캐스틱 라이팅 등 신기능이 Substrate 경로 위주로 개발됩니다.
3. **마이그레이션 비용을 시스템이 흡수합니다.** `r.Substrate`를 켜도 기존 머티리얼 에셋은 디스크에서 안 바뀌고, 셰이더 컴파일 시점에 자동으로 Slab으로 변환됩니다. Blendable 모드에서는 레거시 셰이더를 그대로 컴파일해서 변환 비용조차 없습니다.

## 5. 이 포크(툰 쉐이딩)에 주는 시사점

현재 브랜치에는 두 경로가 공존합니다.

- 레거시 `SHADINGMODELID_TOON_LIT` (14) — deprecated 트랙 위의 커스텀
- Substrate `SUBSTRATE_BSDF_TYPE_TOON` (6) — 미래 트랙 위의 커스텀

장기적으로 유지보수할 것은 Substrate 쪽입니다. 스톡 엔진이 `SUBSTRATE_BSDF_TYPE_CUSTOM = 7`을 커스텀용으로 예약해둔 것도 참고할 만합니다. 엔진 버전 머지 시 레거시 쪽 커스텀은 충돌 부담이 계속 커질 것이므로, 툰 기능 확장은 Substrate BSDF 쪽에 집중하는 것이 좋습니다.

## 주요 파일 지도

| 파일 (Engine/Shaders/Private/Substrate/) | 역할 |
|---|---|
| `Substrate.ush` | 코어: 구조체, Slab/Hair/Eye/Water/Toon 빌더, pack/unpack |
| `SubstrateEvaluation.ush` | `SubstrateEvaluateBSDFCommon` 통합 평가, 환경광, 임포턴스 샘플링 |
| `SubstrateTree.ush` | 레이어링 연산자 트리 순회 |
| `SubstrateDeferredLighting.ush` / `SubstrateForwardLighting.ush` / `SubstrateMobileForwardLighting.ush` | 라이트별 적분 래퍼 |
| `SubstrateLegacyConversion.ush` | 레거시 머티리얼 그래프 → Slab 자동 변환 |
| `SubstrateExport.ush` / `SubstrateRead.ush` | Substrate ↔ 레거시 GBuffer 상호 변환 |
| `SubstrateMaterialClassification.usf` / `SubstrateTile.usf` | 타일 분류, 타일 렌더링 |
| Engine/Shaders/Shared/`SubstrateDefinitions.h` | C++/셰이더 공유 상수 (BSDF 타입, 타일 타입, 클로저 한계) |
| Engine/Source/Runtime/Renderer/Private/Substrate/`Substrate.cpp` | 머티리얼 버퍼 할당, 분류 패스, 런타임 CVar |
| Engine/Source/Runtime/RenderCore/Private/`RenderUtils.cpp` | 활성화/플랫폼 게이팅, 프로젝트 레벨 CVar |
