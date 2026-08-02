# ToonLit 쉐이딩 모델 구현 보고서

이 문서는 `ToonLit` 쉐이딩 모델에 추가한 얼굴 2D 오프셋 그림자, Toon Profile offset 연결, 반투명 눈썹 fade 기능의 구조를 공부용으로 정리한 보고서입니다.

## 목표

`ToonLit`은 기존 UE 기본 조명을 그대로 쓰는 모델이 아니라, 서브컬처 캐릭터 렌더링에 필요한 제어점을 명확히 분리하는 방향으로 설계했습니다.

- `Toon Profile`은 캐릭터별 램프, diffuse/specular offset, GI scale을 관리합니다.
- 얼굴 그림자는 BaseColor에 섞지 않고, 조명 ramp를 어둡게 만드는 shading control 값으로 처리합니다.
- 눈썹/얼굴 오버레이는 `Translucent` 머티리얼에서 opacity fade를 직접 조절할 수 있게 합니다.
- 같은 엔진 기능을 쓰되, 일반 표면과 얼굴/눈썹 특수 표면을 GBuffer 모드로 분리해서 서로의 데이터를 오염시키지 않게 합니다.

## 주요 변경 파일

- `Engine/Source/Runtime/Engine/Classes/Engine/EngineTypes.h`
  - `MSM_ToonLit`에 한글 툴팁을 추가했습니다.

- `Engine/Source/Runtime/Engine/Public/Materials/Material.h`
  - `Toon Profile` 프로퍼티에 한글 주석과 툴팁을 추가했습니다.

- `Engine/Source/Runtime/Engine/Public/Materials/MaterialExpressionToonLitMaterialOutput.h`
  - `ToonLit Material` custom output 노드를 정의했습니다.
  - 입력 핀은 `Face 2D Offset Shadow`, `Translucent Eyebrow Fade`, `Toon Material ID`, `Toon Pattern UVs`입니다.

- `Engine/Source/Runtime/Engine/Private/Materials/MaterialExpressions.cpp`
  - classic material compiler 경로에서 custom output 4개를 HLSL 함수로 내보냅니다.
  - 얼굴 그림자와 눈썹 fade는 `-1`을 비활성 sentinel로 둡니다.

- `Engine/Source/Runtime/Engine/Private/Materials/MaterialExpressionsToMIR.cpp`
  - MIR material compiler 경로에서도 같은 custom output 4개를 내보냅니다.

- `Engine/Shaders/Private/ToonProfileCommon.ush`
  - ToonLit용 encode/decode helper를 추가했습니다.
  - 얼굴 2D offset shadow helper, material id fade helper, ToonLit GBuffer 모드 판별 helper를 둡니다.

- `Engine/Shaders/Private/ShadingModelsMaterial.ush`
  - material graph 결과를 GBuffer `CustomData`에 기록합니다.
  - 일반 프로필 모드와 특수 오버레이 모드를 분리합니다.

- `Engine/Shaders/Private/ShadingModels.ush`
  - `ToonLitBxDF`가 Toon Profile의 diffuse/specular ramp와 offset texture를 실제로 평가합니다.
  - 얼굴 그림자는 diffuse ramp 값에 `min()`으로 합성해서, 얼굴 SDF가 조명을 밝게 만들지 못하게 했습니다.

- `Engine/Shaders/Private/BasePassPixelShader.usf`
  - `Translucent Eyebrow Fade`가 연결된 ToonLit translucent 머티리얼에서 실제 `Opacity`를 곱합니다.

- `Engine/Shaders/Private/PostProcessGBufferHints.usf`
  - GBuffer picking 디버그 출력에서 ToonLit 일반/특수 모드, 얼굴 그림자, 눈썹 fade, material id, profile id를 볼 수 있게 했습니다.

## ToonLit Material Output 노드

`ToonLit Material` 노드는 일반 material attribute pin으로 부족한 ToonLit 전용 데이터를 전달하기 위한 custom output 노드입니다.

### Face 2D Offset Shadow

머티리얼 그래프에서 얼굴 SDF texture, 얼굴 UV, 조명 방향, offset을 이용해 최종 0..1 그림자 값을 만든 뒤 이 핀에 연결합니다.

- `1.0`: 밝음
- `0.0`: 완전 그림자
- 미연결: 얼굴 그림자 특수 모드를 사용하지 않음

조명 평가에서는 이 값을 diffuse ramp의 입력에 `min(RampDiffuseNoL, FaceShadow)`로 적용합니다. 이 방식은 얼굴 그림자가 기존 조명보다 밝아지는 문제를 막기 위한 것입니다.

### Translucent Eyebrow Fade

앞머리에 가려진 눈썹을 별도 translucent overlay material로 그릴 때 쓰는 fade 값입니다.

- 미연결: 기존 Opacity 유지
- 연결 후 `0.0`: 안 보임
- 연결 후 `1.0`: 원래 Opacity 그대로 보임

`BasePassPixelShader.usf`에서 ToonLit translucent 머티리얼의 `Opacity`에 이 값을 곱합니다. 실제로 머리 위에 보이게 하려면 머티리얼/메시 쪽에서 translucent sort priority, disable depth test 같은 렌더 상태도 함께 세팅해야 합니다.

### Toon Material ID

0..255 범위의 ID입니다. Toon overlay나 후처리에서 특정 얼굴/눈썹/부위만 골라내기 위한 값으로 `CustomData.b`에 저장합니다.

### Toon Pattern UVs

Toon Profile의 diffuse/specular ramp offset texture와 hatching pattern을 샘플링할 UV입니다.

일반 캐릭터 표면에서 profile offset을 쓰려면 이 핀에 UV를 연결해야 합니다. 연결하지 않으면 offset texture가 항상 `(0, 0)` 근처만 샘플되어 "작동하지 않는 것처럼" 보입니다.

## GBuffer CustomData 설계

`ToonLit`은 GBuffer custom data 채널이 제한되어 있어서 모든 값을 동시에 고정밀로 저장할 수 없습니다. 그래서 두 모드로 나눴습니다.

### 일반 프로필 모드

얼굴 그림자, 눈썹 fade, material id 특수 출력이 꺼져 있을 때 사용합니다.

```text
CustomData.r = 0
CustomData.g = PatternUV.x
CustomData.b = PatternUV.y
CustomData.a = ToonProfileId
```

이 모드는 Toon Profile의 diffuse/specular offset texture와 shadow hatching을 살리는 모드입니다.

### 특수 오버레이 모드

`Face 2D Offset Shadow`, `Translucent Eyebrow Fade`, `Toon Material ID` 중 하나라도 활성화되면 사용합니다.

```text
CustomData.r = FaceShadow 또는 특수 모드 플래그
CustomData.g = EyebrowFade
CustomData.b = ToonMaterialId
CustomData.a = ToonProfileId
```

이 모드는 얼굴 그림자와 눈썹/오버레이 제어를 우선합니다. 같은 머티리얼에서는 `Pattern UV`를 저장할 공간이 없기 때문에 diffuse/specular offset texture는 비활성화됩니다.

## Toon Profile 연결 방식

### Direct lighting

`ShadingModels.ush`의 `ToonLitBxDF`에서 다음 값을 읽습니다.

- `GetToonProfileEvaluateSettings(ToonProfileId)`
- `EvaluateToonProfileDiffuseDither(...)`
- `EvaluateToonProfileSpecularDither(...)`
- `EvaluateToonProfileShadowHatching(...)`
- `EvaluateToonProfileDiffuseRamp(...)`
- `EvaluateToonProfileSpecularRamp(...)`

기존에는 `ToonProfileDiffuseDither`와 `ToonProfileSpecularDither`가 0으로 고정되어 offset texture가 효과를 내지 못했습니다. 이제 일반 프로필 모드에서는 `Toon Pattern UVs`를 기준으로 offset texture를 샘플합니다.

### Indirect GI

GI scale은 이미 `DiffuseIndirectComposite.usf`에서 `ToonLit`까지 연결되어 있었습니다.

```text
GetToonProfileGISettings(ToonProfileId)
DiffuseIndirectScale
SpecularIndirectScale
```

즉 GI 프로필은 별도 연결이 필요 없고, Toon Profile ID만 올바르게 GBuffer에 들어가면 동작합니다. 단, specular indirect quantization은 기존 엔진의 `SUBSTRATE_EXPERIMENTAL_TOON_REFLECTION_QUANTIZATION` 조건을 따릅니다.

## 얼굴 2D Offset Shadow 사용 흐름

1. 머티리얼을 `ToonLit`으로 설정합니다.
2. `Toon Profile`을 지정합니다.
3. 얼굴 전용 머티리얼에서 얼굴 UV와 조명 방향 기반으로 SDF texture를 offset sample합니다.
4. sample 결과를 threshold, softness, strength로 0..1 그림자 값으로 만듭니다.
5. 이 값을 `ToonLit Material` 노드의 `Face 2D Offset Shadow`에 연결합니다.
6. `ToonLitBxDF`에서 diffuse ramp 입력이 얼굴 그림자 값 이하로 눌립니다.

이 구조는 얼굴 그림자를 색으로 굽지 않습니다. 조명 반응을 제어하는 값으로 둬야 프로필 ramp, 라이트 방향, 얼굴 SDF를 함께 조절할 수 있습니다.

## 반투명 눈썹 사용 흐름

1. 눈썹 overlay mesh나 material slot을 별도로 둡니다.
2. 머티리얼을 `ToonLit` + `Translucent`로 설정합니다.
3. 기존 `Opacity`에는 기본 알파를 넣습니다.
4. `ToonLit Material` 노드의 `Translucent Eyebrow Fade`에 0..1 fade 값을 연결합니다.
5. 필요한 경우 `Toon Material ID`도 연결해서 후처리/디버그에서 영역을 식별합니다.
6. 머리 위로 보이게 하려면 mesh/material 렌더 상태에서 translucent sort priority나 depth test 설정을 함께 조정합니다.

shader 쪽에서는 fade가 실제 `Opacity`에 곱해집니다. 렌더 순서와 depth test는 shader 계산만으로 완전히 뒤집을 수 없기 때문에, 표현용 overlay material 정책과 같이 써야 합니다.

## 설계 철학

첫 번째 원칙은 기존 `Toon Profile` 자산을 재사용하는 것입니다. 이미 엔진에 ramp atlas, offset texture, GI profile path가 있으므로 새 프로필 시스템을 만들지 않았습니다.

두 번째 원칙은 BaseColor 오염을 피하는 것입니다. 얼굴 그림자는 색을 어둡게 칠하는 값이 아니라 조명 ramp를 제어하는 값입니다. 그래야 조명 방향과 ramp profile이 바뀌어도 캐릭터 얼굴이 일관되게 반응합니다.

세 번째 원칙은 GBuffer 한계를 숨기지 않는 것입니다. 한 머티리얼에서 `Pattern UV`, `Face Shadow`, `Eyebrow Fade`, `Material ID`, `Profile ID`를 모두 고정밀로 담을 수 없습니다. 그래서 일반 프로필 모드와 특수 오버레이 모드로 나누고, 어느 기능을 우선하는지 명확하게 했습니다.

네 번째 원칙은 머티리얼 인스턴스 운용을 유지하는 것입니다. `Toon Profile`은 root material에 있고 인스턴스별 override가 가능해야 합니다. 캐릭터별 톤 차이는 material graph를 복제하는 대신 profile 교체로 해결하는 쪽이 유지보수에 유리합니다.

다섯 번째 원칙은 디버깅 가능한 구현입니다. `PostProcessGBufferHints.usf`에 ToonLit custom data 해석을 추가해서, 엔진에서 픽킹하면 현재 픽셀이 일반 프로필 모드인지 특수 오버레이 모드인지 확인할 수 있습니다.

## 한계와 주의점

- 일반 프로필 모드와 특수 오버레이 모드는 같은 머티리얼에서 동시에 완전하게 사용할 수 없습니다.
- `Toon Pattern UVs`를 연결하지 않으면 diffuse/specular offset texture가 눈에 띄게 작동하지 않을 수 있습니다.
- 얼굴 그림자 값은 최종 0..1 shadow factor로 넘겨야 합니다. SDF texture 자체를 바로 넣으면 threshold/softness 제어가 머티리얼마다 흐트러집니다.
- translucent 눈썹을 머리 위에 보이게 하는 렌더 순서는 material opacity만으로 해결되지 않습니다. overlay mesh, sort priority, depth test 정책을 함께 잡아야 합니다.
- shader 변경 후에는 엔진 실행 시 shader recompile이 필요합니다.

## 검증 관점

엔진에서 확인할 때는 다음 순서로 보면 됩니다.

1. 일반 ToonLit 표면에서 `Toon Pattern UVs`를 연결하고 diffuse/specular offset texture가 움직이는지 봅니다.
2. 얼굴 머티리얼에서 `Face 2D Offset Shadow`를 연결하고 그림자가 ramp를 밝게 만들지 않고 어둡게만 누르는지 봅니다.
3. 눈썹 translucent 머티리얼에서 `Translucent Eyebrow Fade`를 0, 0.5, 1로 바꾸며 실제 opacity가 변하는지 봅니다.
4. GBuffer picking으로 `ToonLit Special`, `Face 2D Shadow`, `Eyebrow Fade`, `Toon Material ID`, `Toon Profile ID`가 의도대로 찍히는지 봅니다.
5. GI profile은 직접광이 아니라 indirect pass에서 보이므로, indirect lighting이 있는 씬에서 `DiffuseIndirectScale`과 `SpecularIndirectScale`을 따로 확인합니다.
