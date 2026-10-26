# catchtable-frontend

Techeer 2026-2 E팀 — 캐치테이블 클론 프론트엔드

## 문서와 AI 협업

| 처음 확인할 내용 | 위치 |
| --- | --- |
| Codex·Claude 공통 작업 규칙 | [AGENTS.md](AGENTS.md), Claude 진입점 [CLAUDE.md](CLAUDE.md) |
| 구성·실행·검증·Notion 정본 | [프로젝트 기준](docs/PROJECT.md) |
| 팀원별 도구 연결과 작업 순서 | [협업 안내](docs/ai-workflow.md) |
| 이슈·PR·AI 작업 지시 | [이슈](.github/ISSUE_TEMPLATE/task.md), [PR](.github/pull_request_template.md), [작업 지시](docs/templates/task-brief.md) |
| 변경 이유와 검증 기록 | [work-log](work-log/README.md) |
| 미결정·계약 차이 | [확인할 사항](docs/OPEN_ITEMS.md) |

현재 `main`은 문서 전용이며 앱 코드는 `dev`에 있습니다. 이번 문서가 `dev`에서 자동으로 읽히지는 않습니다. 구현 작업에서는 위 문서를 명시적으로 전달하고, [dev의 기존 개발 안내](https://github.com/Techeer-2026-2-E/catchtable-frontend/blob/e47b63b2c546dd5ff3d3b327b0299c5453b3342d/README.md)를 함께 확인합니다.

## 기술 스택

확인한 `dev` 구현 기준입니다. 현재 `main`에 앱 실행 파일은 없습니다.

- React 19 + Vite 8 + TypeScript 6, React Router
- 서버 상태 TanStack Query, 클라이언트 상태 Zustand, HTTP axios
- CSS Modules·공통 디자인 토큰, MSW 목 API, oxlint

## 실행 방법

Node.js 22.22.0 이상과 npm을 준비하고 **앱 코드가 있는 `dev` 체크아웃** 루트에서 실행합니다. 잠금 파일 기준의 설치·검증 명령은 다음과 같습니다.

```bash
npm ci
cp .env.example .env  # 처음 한 번만. 기존 .env가 있으면 보존
npm run dev          # http://localhost:5173
```

개발 서버는 MSW가 기본으로 켜져 있습니다. 실제 백엔드 확인 시에는 `.env`의 `VITE_API_MOCKING=false`와 프록시 주소를 설정합니다. `npm run lint`, `npm run build`로 정적 검사를 실행합니다. 빌드에는 TypeScript 검사가 포함되며, 자동 테스트 스크립트는 아직 없습니다. 상세 환경·실제 API 연동 확인은 [프로젝트 기준](docs/PROJECT.md#검증)을 따릅니다.

이번 문서 구성의 `main` 직접 push는 사용자의 명시적 요청에 따른 예외입니다. 일반 개발·발표·배포의 브랜치 규칙은 아래를 유지합니다.

## 브랜치 전략

```
main          배포용 최종본. 직접 push 금지.
 └── dev      개발 통합 브랜치 (default)
      └── feature/15-reservation-form
```

- 모든 작업은 `dev`에서 브랜치를 따서 시작하고, PR은 `dev`로 보냅니다.
- `main`은 발표/배포 시점에만 `dev → main` PR로 올립니다.

### 브랜치 이름

`<타입>/<이슈번호>-<짧은-설명>`

| 타입 | 용도 |
|---|---|
| `feature` | 새 기능·화면 |
| `fix` | 버그 수정 |
| `refactor` | 동작 변화 없는 구조 개선 |
| `style` | UI·스타일 |
| `chore` | 설정·CI·의존성 |
| `docs` | 문서 |
| `hotfix` | main 긴급 수정 |

예: `feature/15-reservation-form`, `fix/28-calendar-timezone`

### 커밋 / PR 제목 컨벤션

```
feat: 예약 폼 화면 추가
fix: 캘린더 시간대 표시 오류 수정
style: 매장 카드 레이아웃 정리
refactor: API 클라이언트 분리
chore: ESLint 설정 추가
docs: README 실행법 보강
```

squash merge를 쓰기 때문에 **PR 제목이 곧 커밋 메시지**가 됩니다. PR 제목도 위 규칙을 따라주세요.

### 머지 규칙

- `feature → dev` : **Squash and merge**
- `dev → main` : **Merge commit**
- Rebase merge는 사용하지 않습니다.

## 작업 흐름

```bash
git switch dev
git pull origin dev
git switch -c feature/15-reservation-form
# 작업 & 커밋
git push -u origin feature/15-reservation-form
# GitHub에서 PR 생성 (base: dev)
```
