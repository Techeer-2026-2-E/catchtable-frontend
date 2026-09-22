# catchtable-frontend

Techeer 2026-2 E팀 — 캐치테이블 클론 프론트엔드

## 기술 스택

- React + Vite
- TypeScript

## 실행 방법

> 초기 프로젝트 세팅 후 업데이트 예정

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
