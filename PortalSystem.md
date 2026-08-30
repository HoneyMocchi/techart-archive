# Cinematic Portal System

SceneCapture2D나 추가 Scene View 없이 동작하는 연출용 포탈 구현입니다.

## 바로 확인하기

1. `/Game/Portal/Maps/L_PortalTest`를 엽니다.
2. PIE를 시작합니다.
3. 배치된 `BP_PortalActor_Demo`가 열림 → 테스트 액터 출몰 → 닫힘을 반복합니다.

테스트 액터에는 Static Mesh와 Skeletal Mesh가 함께 있으며, 둘 다
`BPC_PortalClipReceiver`와 `M_PortalClipReceiver`를 사용합니다.

## 실제 몬스터에 적용하기

1. 몬스터 Actor에 `Portal Clip Receiver` 컴포넌트를 추가합니다.
2. 클리핑할 머티리얼에서 `MF_PortalClip`을 호출합니다.
3. Masked 머티리얼은 `ClipAlpha`를 `Opacity Mask`에 연결합니다.
4. Translucent Niagara 머티리얼은 `ClipAlpha`를 기존 Opacity에 곱합니다.
5. 포탈의 `MonsterClass`에 몬스터 Blueprint를 지정합니다.

Receiver는 각 머티리얼 슬롯의 MID를 한 번만 만들고 재사용합니다. 머티리얼에
`MF_PortalClip` 파라미터가 없으면 해당 슬롯은 값을 무시하므로 자동 클리핑되지 않습니다.

## 형상 마스크

- `Use Texture Mask`가 꺼져 있으면 기본 타원형 포탈을 사용합니다.
- 텍스처/SDF 형상을 사용할 때는 `MaskTexture`를 지정하고 `Use Texture Mask`를 켭니다.
- `Threshold`, `Feather`, `Invert`, `MaskUVScale`, `MaskUVOffset`으로 형상을 조절합니다.
- 일반 마스크와 SDF 모두 같은 입력을 사용하며, SDF는 `Threshold` 주변의 `Feather`가 림 폭처럼 동작합니다.

## 주요 런타임 API

- `PlayPortalSequence`: 열림, 스폰, 통과, 닫힘 전체 실행
- `OpenPortal` / `ClosePortal`: 개폐만 실행
- `SetOpenProgress`: 외부 Sequencer나 Blueprint가 0~1 진행률을 직접 제어
- `QualityLevel`: Fake Geometry 카드 수를 0~2로 조절
- `NiagaraCountScale`: Niagara `User.NiagaraCountScale`에 전달

## 에셋 재생성

`Content/Python/generate_portal_assets.py`는 일반 실행 시 기존 머티리얼을 보존하면서
Blueprint와 테스트 맵 설정을 동기화합니다. 포탈 소유 머티리얼을 의도적으로 다시 만들 때만
에디터 명령줄에 `-PortalForceRebuild`를 추가합니다. 이 플래그는 `/Game/Portal/Materials`의
스크립트 소유 에셋 6개만 삭제 후 재생성합니다.

Custom Depth/Stencil은 사용하지 않으며, C++ 코드와 생성 에셋 어디에도 SceneCapture 컴포넌트가 없습니다.
