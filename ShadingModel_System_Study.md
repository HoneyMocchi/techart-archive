# 레거시 쉐이딩 모델 시스템 구조 정리

이 문서는 UE5.8 레거시(디퍼드) 쉐이딩 모델 시스템의 구조, 16개 ID 제한의 원인, `ShadingModels.ush` 읽는 법, 그리고 5.8에 새로 들어온 Material IR을 공부용으로 정리한 문서입니다.

## 쉐이딩 모델 ID와 16개 제한

### ID가 사는 곳

쉐이딩 모델은 두 곳에서 정의됩니다.

- C++ enum: `Engine/Source/Runtime/Engine/Classes/Engine/EngineTypes.h`의 `EMaterialShadingModel` (`MSM_*`)
- 셰이더 define: `Engine/Shaders/Private/ShadingCommon.ush`의 `SHADINGMODELID_*`

이 포크의 현재 슬롯 사용 현황은 다음과 같습니다.

| ID | 모델 | 비고 |
|---|---|---|
| 0~12 | Unlit ~ Substrate | 스톡 엔진 |
| 13 | `SHADINGMODELID_SUBSTRATE_TOON` | 이 포크에서 추가 |
| 14 | `SHADINGMODELID_TOON_LIT` | 이 포크에서 추가 |
| 15 | (비어 있음) | 남은 유일한 슬롯 |

### 왜 16개인가

`ShadingCommon.ush`의 주석이 이유를 그대로 말해줍니다. GBuffer의 8비트 채널 하나를 **하위 4비트 = 쉐이딩모델 ID, 상위 4비트 = SKIP_* 플래그**로 나눠 씁니다 (`SHADINGMODELID_MASK 0xF`). 4비트라서 0~15, 16개가 한계입니다. 늘리려면 GBuffer 인코딩 자체를 바꿔야 해서 대공사가 됩니다.

### Clear Coat 같은 안 쓰는 모델이 자리를 차지하는 문제

- 슬롯을 차지하는 것은 맞지만 **런타임 비용은 거의 없습니다**. 머티리얼이 안 쓰면 라이팅 셰이더의 해당 분기가 실행되지 않습니다. 낭비는 슬롯 하나라는 명목상 낭비입니다.
- 슬롯이 정말 모자라면 안 쓰는 스톡 모델(ClearCoat=4, PreintegratedSkin=3)의 ID를 커스텀 모델로 갈아치우는 방법이 있습니다. 단 enum 값이 에셋에 직렬화되어 있어서, 해당 모델을 쓰는 마켓 에셋/엔진 콘텐츠가 엉뚱하게 렌더링될 리스크가 있습니다.
- 장기적으로는 Substrate가 이 4비트 ID 체계 자체를 없애는 방향이라 에픽은 레거시 슬롯을 정리하지 않습니다. (Substrate 상세는 `Substrate_Study_Report.md` 참조)

## ShadingModels.ush 읽는 법

`Engine/Shaders/Private/ShadingModels.ush` (약 1,270줄)는 사실상 **"같은 계약을 따르는 BxDF 함수 12개 + 디스패처 1개"**로 구성됩니다.

### 파이프라인에서의 위치

디퍼드 라이팅 패스가 픽셀마다 하는 일은 다음과 같습니다.

```
GBuffer 읽기 → 라이트마다 반복 { IntegrateBxDF() 호출 → 결과 누적 } → 최종 색
```

이 파일은 그 중 `IntegrateBxDF()`를 제공합니다. "재질 + 빛이 주어졌을 때 이 픽셀이 빛을 어떻게 반사하는가"를 쉐이딩 모델별로 계산합니다.

### 추천 읽기 순서

1. **계약(인터페이스)**: `FDirectLighting`(출력: Diffuse/Specular/Transmission)과 `FShadowTerms`(입력: 그림자 항) 구조체를 먼저 봅니다. 모든 BxDF가 `(GBuffer, N, V, AreaLight, Shadow) → FDirectLighting` 형태로 통일되어 있습니다.
2. **디스패처**: `IntegrateBxDF`의 switch문입니다. `GBuffer.ShadingModelID`를 소비하는 곳이며 파일의 목차 역할을 합니다.
3. **표준 구현 정독**: `DefaultLitBxDF`. 모든 모델의 원형입니다.
   - `AreaLight.NoL > 0` 체크 — 빛이 표면 뒤면 스킵합니다
   - `BxDFContext` 초기화 — N·L, N·V, N·H, V·H 내적 사전 계산 (정의는 `BxDF.ush`)
   - Diffuse = `Diffuse_Lambert()`, Specular = `SpecularGGX()`
4. **커스텀 코드와 비교**: `ToonLitBxDF`를 DefaultLit과 비교하며 어디가 표준이고 어디가 툰 커스텀인지 경계를 파악합니다. 툰 쉐이딩의 본질은 `NoL`을 연속값 대신 램프/계단으로 바꾸는 것입니다.
5. Hair/Eye/ClearCoat 등 특수 모델은 각자 논문급 배경이 깔려 있어 필요할 때만 봅니다. 상당수에 `UE_DEPRECATED 5.7 - Deprecated by Substrate` 주석이 붙어 있습니다.

### 필요한 배경지식

**N(법선), V(카메라 방향), L(빛 방향), H(V와 L의 중간 벡터)** 네 벡터와 그 내적이 라이팅의 재료입니다. `NoL`은 면이 빛을 얼마나 정면으로 받는가, `NoH`는 하이라이트 중심에 얼마나 가까운가를 뜻합니다.

### 함께 열어둘 파일

- `Engine/Shaders/Private/BxDF.ush` — `BxDFContext`와 `Init()` 정의
- `Engine/Shaders/Private/BRDF.ush` — `Diffuse_Lambert`, GGX 항의 실제 수식

### 실험 루프

셰이더는 엔진 리빌드가 필요 없어서 수정 → 확인 루프가 몇 초면 됩니다.

1. 코드 한 줄 수정 (예: `Lighting.Diffuse = float3(1,0,0);`)
2. 에디터 콘솔 `recompileshaders changed` (Ctrl+Shift+.)
3. 뷰포트에서 확인

"Specular만 0으로 꺼보기", "`NoL`을 `step(0.5, NoL)`로 바꿔 강제 툰 만들기" 같은 실험이 각 항의 역할을 익히는 데 효과적입니다.

## Material IR (5.8 신규)

5.8에 들어온 머티리얼 번역기(translator)의 차세대 재작성입니다. 소스는 `Engine/Source/Runtime/Engine/{Public,Private}/Materials/MaterialIR*`에 있습니다.

### 배경

기존 `FHLSLMaterialTranslator`는 머티리얼 노드 그래프를 걸으면서 HLSL 문자열을 그 자리에서 이어붙이는 단일 패스 구조입니다. 중간 표현이 없어 최적화, 타입 분석, 다른 백엔드 지원이 어려웠습니다.

### 구조

일반 컴파일러의 AST → IR → 기계어 구조를 머티리얼 컴파일에 도입했습니다.

1. **그래프 → IR**: 노드 그래프를 타입이 명확한 중간 표현으로 변환합니다 (`MaterialIRModuleBuilder`, `MaterialIREmitter`)
2. **분석/최적화**: 상수 폴딩, 중복 제거, preshader(픽셀마다가 아니라 CPU에서 미리 계산 가능한 부분) 분리를 수행합니다 (`MaterialIRValueAnalyzer`, `MaterialIRPreshader`)
3. **IR → HLSL**: 최종 코드를 생성합니다 (`MaterialIRToHLSLTranslator`)

### 현재 상태

5.8에서도 프로토타입입니다. `MaterialInterface.cpp`의 `IsUsingNewHLSLGenerator()` 기준으로, CVar `r.Material.Translator.EnableNew` + 머티리얼별 `bEnableNewHLSLGenerator` 플래그를 둘 다 켜야 작동하는 옵트인이며 기본은 레거시 번역기입니다.

이 포크의 ToonLit 커스텀 노드는 두 경로 모두에 구현되어 있습니다(`MaterialExpressions.cpp` = 레거시, `MaterialExpressionsToMIR.cpp` = MIR). 나중에 MIR이 기본이 되는 버전으로 머지할 때 대응 작업이 생길 수 있습니다.
