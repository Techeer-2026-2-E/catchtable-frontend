# CatchTable 프런트엔드 프로젝트 기준

> 확인일: 2026-10-27. 구현 기준은 `dev`의 `e47b63b2c546dd5ff3d3b327b0299c5453b3342d`이다. 초기 `main`의 `30d4690`을 기준으로 이번 문서만 반영한다. 아래 코드·설정 링크는 확인한 구현 커밋을 가리킨다. 실행 명령은 앱 코드가 있는 체크아웃에서 사용한다.

## 목적과 구성

고객의 레스토랑 탐색·예약·웨이팅과 점주의 매장 운영을 지원하는 Techeer 2026-2 E팀 프런트엔드다. 기능별 범위·담당·Phase는 Notion 기능명세에서 확인한다. [백엔드](https://github.com/Techeer-2026-2-E/catchtable-backend)와 별도 저장소이며, 화면·목 구현의 존재만으로 실제 연동 완료를 뜻하지 않는다.

| 구성 | 역할과 근거 |
| --- | --- |
| React 19 / Vite 8 / TypeScript 6 / npm | [package.json](https://github.com/Techeer-2026-2-E/catchtable-frontend/blob/e47b63b2c546dd5ff3d3b327b0299c5453b3342d/package.json), [잠금 파일](https://github.com/Techeer-2026-2-E/catchtable-frontend/blob/e47b63b2c546dd5ff3d3b327b0299c5453b3342d/package-lock.json) |
| React Router / TanStack Query / Zustand / axios | 라우트, 서버 상태, 클라이언트 상태, 공통 HTTP 요청 |
| CSS Modules / lucide-react / 공통 UI·토큰 | [디자인 시스템과 기존 개발 안내](https://github.com/Techeer-2026-2-E/catchtable-frontend/blob/e47b63b2c546dd5ff3d3b327b0299c5453b3342d/README.md#디자인-시스템) |
| MSW / oxlint | 목 API, 정적 린트. 자동 테스트 실행기는 현재 설정되어 있지 않음 |
| FSD 구조 | `app → pages → features → entities → shared`. feature 조합은 pages, 다른 슬라이스 접근은 public API 사용 |

실제 [소스](https://github.com/Techeer-2026-2-E/catchtable-frontend/tree/e47b63b2c546dd5ff3d3b327b0299c5453b3342d/src)는 고객·점주 화면, feature별 API·훅·스토어, entities 타입, shared UI·설정과 `mocks`로 나뉜다. 새 계층이나 테스트 도구가 이미 있다고 가정하지 않는다.

## 문서별 역할

| 주제 | 정본 또는 확인 위치 | 갱신 시점 |
| --- | --- | --- |
| 범위·담당·Phase | [Notion 기능명세](https://app.notion.com/p/58d48d76fa32831298f7814c5b8b0a14) | 팀에서 기능·담당·단계를 바꿀 때 |
| 문제·시나리오·완료 조건 | [PRD](https://app.notion.com/p/3ef48d76fa3281bb9abcd0c7fa609157) | 요구사항을 정하거나 바꿀 때 |
| 기술 요구사항·선택 근거 | [Engineering Requirements Document](https://app.notion.com/p/3ef48d76fa328188b64ce9c4386863f5) | 설계를 검토·결정할 때 |
| API 계약 | [Notion API](https://app.notion.com/p/5cb48d76fa3283e7b711010662ec4e75), 해당 백엔드 구현·테스트 | 요청·응답·상태·이벤트 계약을 바꿀 때 |
| DB 설계 | [Notion DB ERD](https://app.notion.com/p/40748d76fa32839aa437011845ab7f7b) | 백엔드 스키마와 연관된 계약을 확인할 때 |
| UI 구현·실행·검증 | 이 문서, 현재 브랜치 코드·설정, [기존 README](https://github.com/Techeer-2026-2-E/catchtable-frontend/blob/e47b63b2c546dd5ff3d3b327b0299c5453b3342d/README.md) | 해당 내용을 바꾼 작업자가 갱신 |
| 진행·리뷰·머지 상태 | [GitHub 이슈](https://github.com/Techeer-2026-2-E/catchtable-frontend/issues), [PR](https://github.com/Techeer-2026-2-E/catchtable-frontend/pulls) | 해당 서비스에서 관리 |
| 변경 이유·검증 | [work-log](../work-log/README.md), PR 본문 | 중요한 변경을 마칠 때 |
| 미결정·계약 차이 | [확인할 사항](OPEN_ITEMS.md)에서 원본 항목으로 연결 | 차이를 발견하거나 해결할 때 |

Engineering Requirements Document와 DB의 Entity Relationship Diagram을 모두 ERD라고 부르므로 문맥을 구분한다. 화면·Figma가 있다는 이유로 API 지원이나 정책 확정을 추정하지 않는다. 명세와 코드가 다르면 확인한 양쪽 근거와 기준 커밋을 남긴다.

## 로컬 실행

2026-10-29 `dev`를 `main`에 통합해 `main`에서도 앱을 실행할 수 있다 (2026-10-27 확인 당시 `main`은 문서 전용). 일반 개발은 계속 `dev`에서 한다. Node.js **22.22.0 이상**과 npm을 사용한다. 이는 잠금 파일에 있는 React Router·MSW 등의 최소 요구사항을 함께 만족하는 기준이다. 저장소에 Node 버전 고정 파일과 `engines` 설정은 아직 없으므로 실제 검증 버전은 결과에 남긴다.

```bash
npm ci
cp .env.example .env  # 처음 한 번만. 기존 .env가 있으면 보존
npm run dev          # http://localhost:5173
```

잠금 파일을 기준으로 설치하고, 의존성을 바꿀 때만 `package.json`과 `package-lock.json`을 함께 갱신한다. 환경변수는 [.env.example](https://github.com/Techeer-2026-2-E/catchtable-frontend/blob/e47b63b2c546dd5ff3d3b327b0299c5453b3342d/.env.example), 실제 해석은 [env.ts](https://github.com/Techeer-2026-2-E/catchtable-frontend/blob/e47b63b2c546dd5ff3d3b327b0299c5453b3342d/src/shared/config/env.ts), 프록시는 [vite.config.ts](https://github.com/Techeer-2026-2-E/catchtable-frontend/blob/e47b63b2c546dd5ff3d3b327b0299c5453b3342d/vite.config.ts)를 확인한다. 환경값을 바꾸면 개발 서버를 재시작한다.

| 환경값 | 기본값과 의미 |
| --- | --- |
| `VITE_API_BASE_URL` | `/api`. feature API는 `/user/...`, `/owner/...` 형태로 작성 |
| `VITE_API_PROXY_TARGET` | `http://localhost:8080`. Vite 개발 서버의 `/api` 프록시 대상 |
| `VITE_API_MOCKING` | 개발 서버에서는 기본 켜짐. `false`면 실제 API 요청. 배포 빌드는 기본 꺼짐, `true`를 명시하면 목 모드 |

`VITE_*`에 비밀 값을 넣지 않는다. Vite 개발 프록시는 배포 서버 설정을 대신하지 않는다. 배포 빌드의 실제 API 주소·동일 출처 `/api` 라우팅은 별도로 확인한다.

## 목 API와 실제 계약

MSW는 [앱 진입점](https://github.com/Techeer-2026-2-E/catchtable-frontend/blob/e47b63b2c546dd5ff3d3b327b0299c5453b3342d/src/main.tsx)에서 준비된 뒤 화면을 렌더링한다. [mocks](https://github.com/Techeer-2026-2-E/catchtable-frontend/tree/e47b63b2c546dd5ff3d3b327b0299c5453b3342d/src/mocks)에 시드·서버 동작·핸들러가 있으며 localStorage에 목 데이터를 유지한다. 개발용 로그인 버튼과 `window.__mockDb.reset()`은 목 확인용이다. 초기화 전 보존할 브라우저 데이터를 확인한다.

현재 코드는 `[목 전용]` 필드, `[경로 제안]`, P2 MOCK 계약을 포함한다. 기존 개발 안내의 구현 DTO → Notion API → 제안 순서는 현재 호출 가능 여부를 확인하는 순서다. 요구사항·정책 정본은 Notion으로 유지하며, 차이가 있으면 양쪽 근거를 연결해 조정한다. 모든 계약을 이번 문서 작업에서 재감사한 것은 아니다.

실제 백엔드 확인은 별도 브라우저 프로필에서 `VITE_API_MOCKING=false`로 개발 서버를 시작하고 Network 응답·서버 로그를 함께 확인한다. 이전 목 모드의 서비스 워커가 남아 있다면 해당 로컬 사이트의 등록을 해제하고 다시 로드한다. 다른 사이트의 저장 데이터까지 지우지 않는다. 백엔드가 실제 제공하는 API·회원 식별 방법은 그 체크아웃과 명세에서 확인한다.

## 검증

| 목적 | 실행·확인 방법 | 보장 범위 |
| --- | --- | --- |
| 재현 가능한 설치 | `npm ci` | 잠금 파일로 의존성 설치 |
| 린트 | `npm run lint` | oxlint 정적 검사 |
| 타입·프로덕션 빌드 | `npm run build` | `tsc -b && vite build`. 타입 검사와 번들 생성 |
| 빌드본 확인 | `npm run preview` | 빌드본 제공. 현재 Vite 설정의 프록시도 사용하므로 별도 배포 서버의 API 연결 검증과 구분 |
| 변경한 화면·흐름 | 개발 서버에서 관련 경로·사용자 역할·요청 결과 확인 | 로딩·빈 결과·오류·성공, 중복 클릭·뒤로 가기·접근성·시간 경계 중 관련 항목 |
| 실제 API 연동 | MSW 끄기, 백엔드 실행, Network·서버 상태·SSE 수신 확인 | 검증한 시나리오의 실제 연동. 목 동작과 구분 |
| 문서·양식 | 상대 링크·앵커·코드 경로, 명령과 설정의 일치, YAML·Claude import, `git diff --check` | 문서 구성의 일치 |

현재 `package.json`에는 `test` 스크립트가 없다. `npm test`나 테스트 통과를 꾸며 쓰지 않는다. 비단순 로직을 바꾸면 재현 사례·기대 결과를 남기고 가능한 검증을 수행하며 자동화가 없는 한계를 설명한다. 명령·Node/npm 버전·목/실제 API 모드·확인 결과와 미수행 이유를 PR 또는 work-log에 남긴다.

Vite preview는 기본적으로 `server.proxy`를 이어받는다. 로컬 preview에서 API가 연결되어도 실제 배포 서버에 같은 프록시가 있다는 뜻은 아니다. [Vite 공식 문서](https://vite.dev/config/preview-options.html#preview-proxy)를 참고한다.

2026-10-27 확인 시 `main`과 `dev` 모두 활성 GitHub Actions 워크플로가 없다. 로컬 lint·build를 CI 통과나 실제 화면·결제·배포 검증으로 쓰지 않는다. [기록 검사 예제](templates/work-log-check.yml.example)는 비활성 상태이며 앱 CI를 대신하지 않는다.

## 꼭 유지할 경계

- 공통 [axios](https://github.com/Techeer-2026-2-E/catchtable-frontend/blob/e47b63b2c546dd5ff3d3b327b0299c5453b3342d/src/shared/lib/axios.ts)의 재발급·재시도·오류 처리와 회원 식별을 확인한다. 프런트의 Bearer 지원만으로 백엔드 인증 연동 완료를 판단하지 않는다.
- 예약 `CANCELLED`, 웨이팅 `CANCELED`, SSE `RESERVATION_CANCELED`는 현재 계약의 서로 다른 이름이다. `VISITED`는 화면 표시용이며 서버 상태와 구분한다.
- [실시간 알림](https://github.com/Techeer-2026-2-E/catchtable-frontend/blob/e47b63b2c546dd5ff3d3b327b0299c5453b3342d/src/features/notification/hooks/useNotificationStream.ts)의 회원별 연결·정리·이벤트명과 query invalidation을 보존한다. EventSource는 공통 axios 헤더를 사용하지 않는다.
- 진행 중 웨이팅의 polling, mutation 후 상세·목록 캐시 갱신, 선점·호출 제한·영업일의 시간 경계를 함께 확인한다. 브라우저 표시만으로 서버 상태를 확정하지 않는다.
- 공통 디자인 토큰·컴포넌트와 접근성을 보존한다. 목 결제 성공 화면은 실제 PG 승인·환불·영수증 검증의 증거가 아니다.

## 협업 기준

[README Git 규칙](../README.md#git-규칙)(기존 `main` 안내: [브랜치 전략](https://github.com/Techeer-2026-2-E/catchtable-frontend/blob/22380d5d6ffd961c59a7b9e3c76b2f9fa6a9d8c2/README.md#브랜치-전략))을 유지한다. 일반 작업은 `dev`에서 분기해 `dev`로 PR을 만들고 발표·배포 통합은 `dev` → `main`으로 한다. 기존 `main` 안내는 `feature/<이슈번호>-<설명>`, 실제 `dev` 작업은 `feat/`도 사용하므로 새 규칙을 임의로 확정하지 않고 [확인할 사항](OPEN_ITEMS.md)에 연결한다. 커밋·PR 제목은 `<type>: <설명>` 형식이다.

`dev` 개발 안내의 리뷰어 1명 승인·CI 통과 기준과 GitHub 강제 설정은 구분한다. 2026-10-27 GitHub API 조회에서 기본 브랜치는 `dev`, `main`·`dev` 모두 보호 미설정이었다. 이 문서 작업에서 보호 규칙이나 CI를 추가하지 않는다.

이번 문서 구성은 사용자가 명시적으로 요청한 `main` push이며 `dev` 기능을 함께 승격하지 않는다. 이 문서 묶음은 `dev`에 자동 적용되지 않으므로 그 체크아웃에서는 [main의 AGENTS.md](https://github.com/Techeer-2026-2-E/catchtable-frontend/blob/main/AGENTS.md)와 관련 문서를 명시적으로 전달한다. Notion·두 저장소 사이의 자동 동기화는 없다.
