# 확인할 사항

미결정·불일치의 원본으로 가는 안내다. 이슈·Notion의 진행 상태나 기능 목록을 복제하지 않는다. 중요한 차이에만 확인일·근거·다음 행동을 남긴다.

## 브랜치 안내와 적용 범위 — 2026-10-27 확인

- 기존 [main README](https://github.com/Techeer-2026-2-E/catchtable-frontend/blob/22380d5d6ffd961c59a7b9e3c76b2f9fa6a9d8c2/README.md#브랜치-전략)는 `feature/<이슈번호>-<설명>`을 사용하고, 확인한 [dev README](https://github.com/Techeer-2026-2-E/catchtable-frontend/blob/e47b63b2c546dd5ff3d3b327b0299c5453b3342d/README.md#git-규칙)는 `feat/<설명>`을 안내한다. 일반 통합은 모두 `dev`, 발표·배포는 `dev` → `main`이다. 이번 작업에서는 기존 규칙을 보존하고 팀의 다음 정리 때 표기를 맞춘다.
- 이번 문서 묶음은 사용자 요청에 따라 `main`에만 반영한다. `dev`에는 지침·양식이 자동으로 생기지 않는다. 구현 작업에서는 [main의 AGENTS.md](https://github.com/Techeer-2026-2-E/catchtable-frontend/blob/main/AGENTS.md)를 명시적으로 전달하고, `dev` 도입은 별도 반영으로 진행한다.
- 2026-10-29: `dev`(e47b63b)를 `main`에 통합했다. `main` README는 두 README를 합쳤고, 브랜치 표기 차이는 위 항목대로 팀 결정 전까지 둘 다 안내한다. 지침 문서의 `dev` 반영은 여전히 별도다.

## 관련 작업에서 확인할 항목

| 주제 | 확인한 사실·근거 | 다음 행동 |
| --- | --- | --- |
| 목 필드·제안 API와 실제 백엔드 | `dev@e47b63b`의 [타입·API·핸들러](https://github.com/Techeer-2026-2-E/catchtable-frontend/tree/e47b63b2c546dd5ff3d3b327b0299c5453b3342d/src)에 `[목 전용]`, `[경로 제안]`, P2 MOCK 계약이 있음 | 해당 변경 때 [API 정본](https://app.notion.com/p/5cb48d76fa3283e7b711010662ec4e75)·현재 백엔드 DTO·상태·이벤트와 대조. 표시만 제거해 연동 완료로 쓰지 않음 |
| 인증·회원 식별 | 공통 axios는 Bearer와 `X-Member-Id`를 사용하고 SSE는 회원 쿼리를 사용 | 실제 인증 계약을 정할 때 일반 요청·재발급·SSE·목 로그인을 함께 확인 |
| Node 버전·자동 검증 | 잠금 파일의 의존성 최소 요구사항은 Node 22.22.0 이상. 버전 고정 파일·`engines`·`test` 스크립트·활성 CI가 없음 | 현재는 실제 실행 버전과 lint·build·화면 검증을 기록. 버전 고정과 테스트·앱 CI 도입 범위는 후속 팀 결정 |
| GitHub 보호 규칙 | 2026-10-27 API 조회에서 `main`·`dev` 모두 `protected: false` | 리뷰·CI 기준을 GitHub에서 강제할지는 팀에서 결정 |
| 배포 API 연결 | Vite 개발 프록시와 배포 빌드는 설정 범위가 다르고 배포 빌드의 MSW 기본값은 꺼짐 | 배포 작업에서 실제 API 주소·라우팅·서비스 워커 잔존 여부를 확인. 이번에는 배포 설정·실행을 확인하지 않음 |

새 항목에는 확인일·대상 브랜치/커밋, 확인한 사실과 근거, 모르는 점, 영향받는 작업, 다음 행동·이슈 링크를 적는다. 해결되면 결정은 정본에, 실제 변경·검증은 PR 또는 work-log에 남기고 임시 항목을 정리한다. 과거 기록을 현재 사실처럼 덮어쓰지 않는다.
