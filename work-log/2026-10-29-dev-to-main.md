# dev → main 통합

- 작업일: 2026-10-29
- 관련 이슈·PR·Notion: 이슈 없음 (사용자 요청). PR은 `chore/dev-to-main` → `main`
- 기준 브랜치·커밋·환경: `main@22380d5`(문서 전용), `dev@e47b63b`(PR #26~#31까지), Node 22.22.2 · npm 10.9.7

## 배경과 목표

`main`에는 10/27 추가한 공통 작업 지침만 있고 앱 코드는 `dev`에만 있었다. [README 브랜치 규칙](../README.md#머지-방식)의 `dev` → `main` 통합으로 `main`에 지금까지의 화면·목 API 작업을 반영한다. `dev`의 코드는 바꾸지 않는다.

## 판단과 근거

- `dev`를 그대로 `main`으로 PR하면 README 충돌이 나서, `main`에서 `chore/dev-to-main` 브랜치를 따 `dev`를 머지하고 충돌을 해결했다. `dev`에 지침 문서를 넣는 것은 [확인할 사항](../docs/OPEN_ITEMS.md)대로 별도 작업으로 남긴다.
- README는 `dev`의 개발 안내(구조·디자인 시스템·목 API·컨벤션)를 본문으로 두고, `main`의 "문서와 AI 협업" 표와 머지 방식(Squash / Merge commit)을 합쳤다. 브랜치 이름 표기(`feat/<설명>` vs `feature/<이슈번호>-<설명>`)는 팀 결정 전이므로 두 표기를 모두 안내하고 OPEN_ITEMS에 연결했다.
- "main은 문서 전용"이라고 적힌 문장(AGENTS, PROJECT, ai-workflow, OPEN_ITEMS)은 지우지 않고 2026-10-29 정정으로 고쳤다. 사라진 README 앵커(`#브랜치-전략`)는 기존 `main` README 고정 링크로 바꿨다.

## 실제 변경

- `dev`의 앱 코드·설정 전체가 `main`에 들어온다 (충돌은 README 하나).
- 문서: README 병합, AGENTS·PROJECT·ai-workflow·OPEN_ITEMS의 현재 사실 정정, 이 기록 추가.

## 검증

| 확인한 내용 | 실제 명령 또는 방법·환경 | 결과·근거 |
| --- | --- | --- |
| 린트 | `npm run lint` | 통과 (exit 0) |
| 타입·빌드 | `npm run build` | 통과 |
| 문서 상대 링크 | 수정한 5개 문서의 상대 링크 경로 존재 확인 (스크립트) | 깨진 링크 없음 |
| 공백 오류 | `git diff --check HEAD -- README.md AGENTS.md docs` | 통과. `dev`에서 온 `src/shared/ui/toastStore.ts` 끝 빈 줄 경고는 기존 코드라 그대로 둠 |

화면 동작은 `dev`와 같은 코드라 별도 확인하지 않았다. 실제 백엔드 연동·CI·배포는 해당 없음.

## 남은 점과 후속 작업

- `dev`에 지침 문서 반영 (`main` → `dev` 동기화) 여부와 시점은 팀 결정.
- 브랜치 이름 표기 통일.
