# Documentation

엔진 커스텀(툰 쉐이딩) 작업과 관련된 학습/구현 문서 아카이브입니다.

## 목차

| 문서 | 내용 |
|---|---|
| [ToonLit_Study_Report.md](ToonLit_Study_Report.md) | ToonLit 쉐이딩 모델 구현 보고서 — 얼굴 2D 오프셋 그림자, Toon Profile, 눈썹 fade 구조와 변경 파일 목록 |
| [ShadingModel_System_Study.md](ShadingModel_System_Study.md) | 레거시 쉐이딩 모델 시스템 — 16개 ID 제한의 원인, ShadingModels.ush 읽는 법, Material IR(5.8 신규) |
| [Substrate_Study_Report.md](Substrate_Study_Report.md) | Substrate 시스템 분석 — 레거시와의 구조 차이, 타일 분류 최적화, 모바일 지원, 대체 이유, 툰 쉐이딩 시사점 |
| [Compile_Performance_Notes.md](Compile_Performance_Notes.md) | 엔진 컴파일 성능 — CPU 선택 기준(코어/클럭/캐시), 빌드 중 절전 방지 래퍼 |

## 읽는 순서 (처음이라면)

1. `ShadingModel_System_Study.md` — 레거시 시스템의 구조와 한계
2. `ToonLit_Study_Report.md` — 그 위에 구현한 커스텀 모델
3. `Substrate_Study_Report.md` — 레거시를 대체하는 차세대 시스템과 앞으로의 방향
