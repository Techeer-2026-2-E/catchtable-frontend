# catchtable-frontend

Techeer 2026-2 E팀 — 실시간 예약/웨이팅 플랫폼 (캐치테이블 클론) 프론트엔드

## 기술 스택

| 구분 | 사용 기술 |
| --- | --- |
| 빌드 | Vite, TypeScript |
| UI | React 19 |
| 라우팅 | React Router |
| 서버 상태 | TanStack Query |
| 클라이언트 상태 | Zustand |
| HTTP | axios |
| 날짜 | dayjs |
| 린트 | oxlint |

## 시작하기

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
```

- 로컬에서는 Vite 프록시가 `/api` 요청을 백엔드(`VITE_API_PROXY_TARGET`, 기본 `http://localhost:8080`)로 넘깁니다.
- 백엔드: [catchtable-backend](https://github.com/Techeer-2026-2-E/catchtable-backend) (Spring Boot)

## 폴더 구조 (FSD 기반)

```
src/
├── app/                        # 앱 진입점 + 전역 설정
│   ├── providers/              # QueryProvider 등
│   ├── router/                 # 라우트 정의
│   │   └── layouts/            # RootLayout(고객), OwnerLayout(점주 전용)
│   ├── styles/
│   └── App.tsx
│
├── pages/                      # 라우트 단위 화면
│   ├── home/                   # 메인 (주변·인기 매장)
│   ├── search/                 # 매장 검색 / 조건별 목록
│   ├── store-detail/           # 매장 상세
│   ├── reservation/            # 예약하기 (날짜·인원·시간)
│   ├── reservation-detail/     # 예약 상세
│   ├── waiting/                # 내 웨이팅 (실시간 순번)
│   ├── mypage/                 # 예약·웨이팅 내역, 회원정보
│   ├── notifications/
│   ├── login/ · signup/ · not-found/
│   └── owner/                  # 점주
│       ├── dashboard/          # 내 매장 목록
│       ├── store/              # 매장 정보·영업시간·예약 정책
│       ├── tables/             # 좌석(테이블) 설정
│       ├── reservations/       # 예약 운영
│       └── waitings/           # 웨이팅 운영
│
├── features/                   # 도메인별 핵심 로직 (api / hooks / store / components)
│   ├── auth/                   # /api/user/auth — 로그인·회원가입·RequireAuth
│   ├── member/                 # /api/user/members/me
│   ├── store-search/           # /api/user/stores, /categories, /search
│   ├── store-detail/           # /api/user/stores/{storeId}
│   ├── reservation/            # /api/user/reservations — 예약 폼 스토어, 가능 시간 조회
│   ├── waiting/                # /api/user/waitings — useWaitingSSE (실시간 순번)
│   ├── payment/                # /api/user/payments (토스페이먼츠 가결제, P2)
│   ├── notification/           # /api/user/notifications
│   ├── owner-store/            # /api/owner/stores — 매장·테이블 관리
│   ├── owner-reservation/      # /api/owner/reservations
│   └── owner-waiting/          # /api/owner/waitings
│
├── entities/                   # 공통 도메인 타입 (백엔드 DTO·enum 기준)
│
├── shared/
│   ├── ui/                     # Button, Input, Modal …
│   ├── lib/                    # axios(토큰 재발급), queryClient, dayjs, 포맷터, 에러 헬퍼
│   ├── hooks/                  # useDebounce …
│   └── config/                 # env, 라우트 경로 상수(ROUTES, paths)
│
└── main.tsx
```

### 레이어 의존 규칙

```
app → pages → features → entities → shared
```

- 위 레이어는 아래 레이어만 import 합니다. (역방향 ❌)
- 같은 레이어끼리 import 하지 않습니다. (`features/reservation` → `features/waiting` ❌) 여러 feature 조합은 `pages`에서 합니다.
- 다른 슬라이스는 `index.ts`(public API)로만 import 합니다.

```ts
import { useReservationForm } from '@/features/reservation'            // ✅
import { useReservationForm } from '@/features/reservation/hooks/...'  // ❌
```

### 디자인 시스템

Figma「Design System」을 코드로 옮긴 것. 새 화면은 아래를 조합해서 만듭니다.

- **토큰** `shared/styles/tokens.css` — 색·간격·반경·그림자 CSS 변수. 화면에서는 의미 색(`--color-*`)만 사용
- **텍스트 스타일** `shared/styles/typography.css` — `t-title-20`, `t-headline-16`, `t-body-14`, `t-caption-13` …
- **폰트** IBM Plex Sans KR (Google Fonts)
- **공통 컴포넌트** `shared/ui` — Button, Chip, Badge, TopBar, Page/Section, BottomSheet, Dialog, Calendar, ListItem, Banner, Toast …
- **스타일링** CSS Modules (`*.module.css`)
- **아이콘** lucide-react

색 사용 원칙

- 노랑(primary) = 지금 할 행동. **한 화면에 노랑 CTA 1개**, 보조 액션은 soft/outline
- 갈색(secondary) = 선택 상태 (칩, 토글 on)
- 상태 배지는 대부분 neutral/brand. 노랑은 "입장 호출"처럼 즉시 행동이 필요할 때, 빨강은 노쇼 등 예외에만

### 목데이터

API 연동 전까지 화면은 `entities/mock` 의 목데이터를 사용합니다. 개발 서버에서는 로그인 화면의
「고객으로 둘러보기 / 점주로 둘러보기」 버튼으로 로그인 없이 화면을 볼 수 있습니다.

### 상태 관리

- 서버 데이터 → **TanStack Query** (query key는 각 feature의 `api/queryKeys.ts`)
- 여러 화면에 걸친 클라이언트 상태 → **Zustand** (`features/*/store`)
- 컴포넌트 내부 상태 → `useState`

## 코드 컨벤션

- 기능이 드러나는 파일명을 사용하고, 컴포넌트는 PascalCase (`StoreDetailPage.tsx`)
- 훅은 `useCamelCase.ts`, 폴더는 `kebab-case`
- `let`, `const`만 사용 (`var` ❌)
- 스타일 단위는 `rem`, `%` 우선
- 경로 별칭 `@/` → `src/`, 같은 슬라이스 내부는 상대경로
- 라우트 경로는 `shared/config/routes.ts`의 `ROUTES` / `paths` 사용
- 린트 무시 주석보다 실제 오류 해결 우선

## Git 규칙

### 브랜치

| 브랜치 | 용도 |
| --- | --- |
| `main` | 발표·배포 기준 (dev → main PR만) |
| `dev` | 개발 통합, 기본 브랜치 |
| `feat/*`, `fix/*` … | 작업용, 머지 후 삭제 |

브랜치 이름: `<type>/<짧은-설명>` (예: `feat/store-detail`, `fix/waiting-order`)

### 커밋 메시지

```
<type>: <제목>

<본문 (선택) — 무엇을, 왜, 어떻게>
```

| type | 용도 |
| --- | --- |
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `refactor` | 동작 변화 없는 구조 개선 |
| `test` | 테스트 추가·수정 |
| `docs` | 문서 |
| `chore` | 빌드·설정·의존성 |
| `ci` | CI 설정 |
| `style` | 포맷팅 (로직 변화 없음) |

### PR

- 대상은 `dev` (main 직접 PR·push 금지), push 전 pull로 충돌 해결
- 제목은 커밋 형식과 동일 (예: `feat: 매장 상세 페이지`)
- 리뷰어 최소 1명 승인 + CI 통과 후 머지
