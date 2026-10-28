# 목 API → 백엔드 dev API 연동

- 작업일: 2026-10-29
- 관련 이슈·PR·Notion: 이슈 없음 (사용자 요청). PR은 `feat/backend-api-integration` → `dev`
- 기준: 프런트 `dev@e47b63b`, 백엔드 `catchtable-backend dev@7d32049` (Spring Boot 3.3.4 · Java 21)
- 참고: 이 기록 형식은 `main`의 `work-log/README.md`를 따른다. `dev`에는 아직 그 문서가 없다.

## 배경과 목표

P1·P2 화면은 노션 명세와 "제안" 계약으로 만든 MSW 목 API에 붙어 있었다. 백엔드 dev에 API가 많이 들어와서, 실제 응답 형식에 맞추고 백엔드에 없는 기능은 실제 연동 때 404를 부르지 않게 한다. 디자인 개편 전에 데이터 형식을 먼저 확정하려는 목적이다.

## 판단과 근거

- **백엔드에 없는 기능은 지우지 않고 기능 플래그로 숨긴다.** `src/shared/config/backendFeatures.ts`의 `BACKEND_SUPPORTS`에 기능별로 false를 두고, `isFeatureAvailable()`이 실제 연동(`VITE_API_MOCKING=false`, 배포 빌드 기본)에서만 false를 돌려준다. 목 모드에서는 지금처럼 모든 화면을 볼 수 있다. 백엔드에 API가 생기면 값만 true로 바꾸고 계약을 다시 대조한다.
- **`VITE_API_MOCKING=backend` 모드 추가.** 목 API를 쓰되 실제 연동과 같은 플래그로 화면을 보여준다. 백엔드를 띄우지 않고도 실제 연동 화면을 미리 볼 수 있다.
- **로그인은 X-Member-Id.** 백엔드에 인증 API가 없고 `LoginMemberArgumentResolver`가 `X-Member-Id` 헤더로 회원을 식별한다. 실제 연동에서는 로그인 화면의 개발용 계정 버튼이 local-seed의 회원 1(고객)·2(점주)로 로그인하고 `GET /api/user/members/me`로 이름을 받는다. 운영 인증이 아니다.
- **점주 매장 목록은 환경 변수.** `GET /api/owner/stores`가 없어서 `VITE_OWNER_STORE_IDS`(기본 `1`, backend 미리보기는 `2,4`)의 매장을 `GET /api/user/stores/{id}`로 읽는다.
- **예약금 결제는 실제 연동에서 건너뛴다.** 백엔드 dev에는 예약금 개념과 prepare·confirm이 없어서 `POST /api/user/reservations`로 바로 예약한다. 선점·결제 흐름은 목 전용으로 남긴다.
- 철자는 그대로 둔다: 예약 `CANCELLED`, 웨이팅 `CANCELED`, 알림 `RESERVATION_CANCELED`·`WAITING_EXPIRED`(웨이팅 상태는 `NO_SHOW`).

## 실제 변경 — API 계약

| 영역 | 이전 (목·제안) | 이후 (백엔드 dev) |
| --- | --- | --- |
| 이용 내역 | `GET /user/reservations` → 예약 배열, `GET /user/waitings` → 웨이팅 배열 | `GET /user/reservations?type=&status=ACTIVE\|ENDED` → `HistoryItem[]` (예약·웨이팅 통합, 진행 중 먼저). `GET /user/waitings` 목록 제거 |
| 예약 상태 | `HOLDING`·`RELEASED`·`PAID` (선점) | `PENDING_PAYMENT`·`CONFIRMED`·`COMPLETED`·`CANCELLED`·`NO_SHOW`·`EXPIRED`. 선점 id == 예약 id |
| 웨이팅 상태 | `EXPIRED` | `NO_SHOW` (+ `WaitingEndReason`) |
| 웨이팅 신청·조회 | 같은 `Waiting` 응답 | 신청 `WaitingRegistration`, 조회 `WaitingPositionResponse`(`currentPosition`·`teamsAhead`·`expiresAt`·`waitingDate`), 취소 `WaitingTermination` |
| 점주 웨이팅 | `waitingId`·`waitNumber`·`partyCount` | `id`·`waitingNumber`·`partySize`·`compatibleTables`·`respondedAt`. 노쇼는 `{reason, detail}`, 취소는 본문 `{reason}` 필수(204), 호출 응답 `WaitingCallResponse` |
| 점주 실시간 | 10초 polling | `GET /owner/stores/{id}/waitings/subscribe?memberId` SSE(`connect`·`WAITING_CHANGED`) + 30초 polling |
| 고객 알림 SSE | 5종 | 7종 (`RESERVATION_CHANGED`·`WAITING_POSITION_CHANGED` 추가), `payload`, `occurredAt`은 LocalDateTime |
| 매장 상세 | 메뉴 별도 조회 | `description`·`phone`·`imageUrl`·`menus` 포함 |
| 매장 리뷰 | `{summary, reviews}` | `{averageRating, reviewCount, reviews, page, size, hasNext}`, `writerName`, 정렬 `LATEST\|RATING` |
| 내 리뷰 | 배열, `imageUrls[]` | `{reviews, page, size, hasNext}`, `MyReview`(`visitedAt`), 사진은 `imageUrl` 1개(수정 시 `""`이면 삭제), 내용 1000자 |
| 결제 조회 | 배열, `PARTIAL_CANCELED` | `{payments, page, size, hasNext}`, 상세 `{payment, refunds}`, 상태 7종(`PARTIAL_REFUNDED`·`REFUNDED` 등) |
| 회원 | `Member` | `MemberProfile {id, name, phone}` — `userType`은 로그인 정보에서 유지 |
| 웨이팅 설정 | `{open, arrivalLimitMinutes, autoCall}` | `{storeId, open, arrivalLimitMinutes}` (`autoCall`은 목 전용) |

## 실제 변경 — 백엔드에 없어서 실제 연동에서 숨기는 기능

| 플래그 | 화면 처리 |
| --- | --- |
| `auth` | 로그인·가입 대신 개발용 계정(X-Member-Id). 가입 화면에 안내 배너, 토큰 재발급 생략 |
| `notificationInbox` | 알림 화면에 접속 중 받은 실시간 알림만 표시 + 안내 배너 |
| `notificationSettings`·`withdraw` | MY의 해당 메뉴 숨김 |
| `homeStores` | 홈 섹션을 매장 검색 결과로 구성, "현재 위치로" 숨김 |
| `ownerStoreList` | `VITE_OWNER_STORE_IDS` 사용 |
| `menuDelete`·`menuExtras` | 메뉴 삭제·사진·품절 숨김 (이름·가격·설명만) |
| `sales` | 매출 메뉴 숨김, 직접 들어오면 "준비 중" |
| `ownerReviews` | 점주 리뷰는 매장 공개 리뷰로 읽기만, 답글·답변 필터 숨김 |
| `reviewWritable`·`reviewPhotoUpload` | 작성 가능 방문 목록 미조회(이용 완료 예약의 "리뷰 쓰기"로 진입), 사진 첨부 숨김 |
| `waitingDefer`·`waitingRecall`·`waitingAutoCall` | 고객 "조금 늦어요", 점주 호출 재전송·순서 미루기·자동 호출 숨김 |
| `depositPayment`·`refundPreview` | 결제 없이 바로 예약, 환불 예상액 미조회 |

MSW 핸들러·시드도 위 응답 형식으로 바꿨다 (localStorage 키 `catchtable-mock-db-v3`로 올려 이전 데이터는 다시 시드). 웨이팅 변경 시 점주 `WAITING_CHANGED`, 대기 고객 `WAITING_POSITION_CHANGED`를 보낸다.

## 검증

| 확인한 내용 | 실제 명령 또는 방법·환경 | 결과·근거 |
| --- | --- | --- |
| 린트 | `npm run lint` | 통과 (exit 0) |
| 타입·빌드 | `npm run build` (`tsc -b` 포함) | 통과 |
| 목 모드 화면 | Playwright(Chromium), `npm run dev` 기본 — 고객: 홈·마이다이닝·웨이팅·매장 상세·알림·MY·내 리뷰·프로필·예약(예약금 매장 결제까지). 점주: 대시보드·매장·웨이팅(호출·노쇼 사유)·메뉴·리뷰·매출 | 페이지 오류·4xx 없음 (점주 노쇼 409 1건은 데모 대기열이 먼저 착석시킨 뒤 누른 것으로, 오류 토스트 정상 표시) |
| backend 미리보기 | 같은 흐름을 `VITE_API_MOCKING=backend` 로 | 숨김 대상이 모두 숨겨짐, 예약금 매장도 결제 없이 예약 완료 |
| 목 계약 | 브라우저에서 fetch로 점주 호출·노쇼(사유 공백 400)·취소(사유 없음 400 / 204)·설정, 내역 `ACTIVE`/`ENDED`, 리뷰 페이지 응답 확인 | 위 표의 형식과 일치 |
| 실시간 갱신 | 웨이팅 화면을 열어 두고 데모 대기열 진행 관찰 | 순번 3→2번째 갱신 후 "입장 가능합니다!" 전환 |

**실제 백엔드 연동은 아직 확인하지 않았다.** 클라우드 환경에서 Gradle 의존성을 받을 수 없어 백엔드를 띄우지 못했다. 로컬에서 백엔드를 띄워 `VITE_API_MOCKING=false`로 확인해야 한다. CI·배포는 해당 없음.

## 남은 점과 후속 작업

- 로컬 실제 연동 확인 (백엔드 `docker compose`의 Postgres → `./gradlew bootRun` → `scripts/local-seed.sql` → 프런트 `.env`에 `VITE_API_MOCKING=false`).
- 백엔드에 생기면 플래그를 켜고 계약 재대조: 인증, 알림함·설정, 탈퇴, 홈(주변·인기, `latitude`/`longitude` 쿼리), 점주 매장 목록, 메뉴 삭제·사진·품절, 매출, 점주 리뷰·답글, 작성 가능 방문, 사진 업로드, 웨이팅 미루기·재호출, 예약금 결제·환불 예상액.
- 백엔드 선점 응답에 예약금 금액이 없다 (`depositAmount`는 목 전용).
- 이 브랜치는 이슈 번호 없이 만들었다. 팀 규칙대로 이슈를 만들면 브랜치 이름·PR 본문에 연결한다.

---

## 후속 (2026-10-29): 백엔드에 없는 요소 삭제

- 기준: 백엔드 `dev@7da9c1d` (앞 기록의 `7d32049` 이후 코드 변경 없음, 문서만 추가됨)
- 사용자 결정: 회원가입은 삭제하고 로그인은 시작 회원 선택만 남김. 목 API 는 남기되 백엔드 계약만.

### 판단

- 앞 단계의 기능 플래그(`BACKEND_SUPPORTS`)와 `VITE_API_MOCKING=backend` 모드를 없앴다. 백엔드가 보내지 않는 값, 백엔드로 보내지 않는 입력은 화면·타입·API·목에서 모두 지웠다.
- 백엔드 값으로 계산만 하는 표시는 남겼다: 홈의 "웨이팅 가능한 매장"(`waitingAvailable`), 점주 예약 목록의 테이블 번호(`tableId` → 테이블 목록).
- 점주 리뷰 화면은 매장 공개 리뷰 API 로 읽기만 한다 (`GET /api/user/stores/{id}/reviews`).
- 리뷰 내용 10자 이상 같은 프런트 자체 규칙은 백엔드 기준(공백 불가·1000자)으로 바꿨다.

### 삭제한 것

| 영역 | 삭제 |
| --- | --- |
| 인증 | 회원가입 화면, 이메일·비밀번호 로그인, 소셜 로그인 버튼, 토큰 저장·재발급 → 시작 화면에 「고객으로 시작 / 점주로 시작」만 |
| 홈·검색 | 위치(현재 위치·주변 매장), 프로모션 배너, 키워드 검색, 정렬(평점·리뷰순), 웨이팅 가능 필터 |
| 매장 | 평점·리뷰 수·지역·가격대·최대 인원·예약금·웨이팅 팀 수·썸네일·좌표, 저장(하트)·공유 버튼, 메뉴 사진·품절 |
| 예약 | 테이블 타입·메뉴·방문 목적·요청사항 선택, 예약금 결제·선점 흐름, 환불 예상액, 좌석 표시 → 날짜·시간·인원 → 확인 2단계 |
| 웨이팅 | 좌석 조건, 예상 대기시간, 현재 대기 팀 수(신청 전), 고객 "조금 늦어요", 점주 호출 재전송·순서 미루기·자동 호출 |
| 리뷰 | 작성 가능 방문 목록, 사진 첨부, 점주 답글·답변 필터·별점 분포 |
| MY·알림 | 알림 수신 설정, 결제수단 관리, 회원 탈퇴, 알림함 목록·읽음·안 읽은 수 배지 (접속 중 실시간 알림 목록만 남김) |
| 점주 | 매출 관리 화면, 매장 등록 버튼, 메뉴 삭제, 테이블 공간 타입, 테이블 번호·인원 수정(백엔드는 운영 상태만 수정), 예약금 표시 |
| 공통 | `payment` 엔티티·feature, `backendFeatures.ts`, `tokenStorage`, 이미지 리사이즈 유틸 |

### 백엔드에 있지만 프런트가 쓰지 않는 것

| 종류 | 백엔드 API·필드 | 비고 |
| --- | --- | --- |
| API | `GET /api/user/stores/{storeId}/tables?reservationStartAt&partySize` | 특정 시각 잔여 테이블 수 — availability 슬롯으로 대신 표시 |
| API | `POST /api/user/reservations/holds`, `GET·DELETE /holds/{holdId}` | 5분 선점 — 결제 승인 API 가 없어 화면에서 뺌 |
| API | `GET /api/user/payments`, `GET /api/user/payments/{paymentId}` | 결제 내역·상세 |
| API | `PATCH /api/owner/stores/{storeId}` | 매장 정보 수정 (이름·카테고리·주소·설명·전화·이미지 URL) |
| API | `GET /api/owner/reservations/{reservationId}` | 점주 예약 단건 — 목록으로 처리 |
| 요청 | 매장 리뷰 `sort=RATING`, `page` | 최신순 첫 페이지만 |
| 요청 | 내 리뷰 `page` | 첫 50개만 |
| 요청 | 이용 내역 `type=RESERVATION\|WAITING` | `status` 만 사용 |
| 요청 | 점주 예약 목록 `status` | 날짜만 보내고 화면에서 탭으로 나눔 |
| 요청 | 리뷰 작성·수정 `imageUrl` | 업로드 API 가 없음 |
| 응답 | 매장 상세 `description`, `phone` | 화면에 표시하지 않음 |
| 응답 | 매장 리뷰 `averageRating`, `hasNext` | 평균은 점주 리뷰 화면에서만 표시 |
| 응답 | 예약 `tableId`·`confirmedAt`, 점주 예약 `memberId`·`checkedInByMemberId`·`noShowAt`·`noShowByMemberId`·`cancelledAt` | |
| 응답 | 점주 웨이팅 `compatibleTables`·`respondedAt`·`arrivalIntent`·`storeName`, 고객 웨이팅 `calledAt` | |
| 응답 | 호출 `callCount`·`expiresAt`, 종료 `reason`·`detail`·`endedAt`, 호출 응답 `respondedAt`·`expiresAt`, 리뷰 작성 결과 | 성공 후 목록·상세를 다시 조회 |
| 응답 | SSE `payload` (호출 시각·만료 시각, 순번) | 알림이 오면 다시 조회만 함 |
| 응답 | 오류 `code` | `message` 만 표시 |

### 검증 (후속)

| 확인한 내용 | 실제 명령 또는 방법·환경 | 결과·근거 |
| --- | --- | --- |
| 린트 | `npm run lint` | 통과 |
| 타입·빌드 | `npm run build` | 통과 |
| 목 모드 화면 | Playwright(Chromium) — 고객: 홈·검색·매장 상세·마이다이닝·웨이팅·알림·MY·웨이팅 신청·예약(확인 → 완료). 점주: 매장 목록·매장·웨이팅·예약·테이블·메뉴·리뷰·정책·영업시간 | 페이지 오류·4xx 없음 |

실제 백엔드 연동은 이번 후속에서 다시 돌리지 않았다 (사용자가 앞 단계에서 로컬 확인).
