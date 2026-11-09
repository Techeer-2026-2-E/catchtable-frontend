# 2026-11-09 점주 매장 관리 (와이어프레임 → 코드, 묶음 3)

브랜치: `feat/owner-store-management` (origin/dev 기준)

## 추가
- **매장 정보 수정** `/owner/stores/:storeId/info` — `PATCH /api/owner/stores/{storeId}`
  - 사진 주소 + 미리보기, 이름, 카테고리 칩, 주소, 전화번호(0X-XXXX-XXXX), 소개(1000자)
  - 조회 API 가 없어서 초기값은 고객용 매장 상세 사용, 저장 후 매장 목록·상세 캐시 무효화
- **특정일 휴무, 영업 변경** `/owner/stores/:storeId/hours/special`
  - `GET /special-business-days`, `PUT·DELETE /special-business-days/{yyyy-MM-dd}`
  - 목록 카드(휴무 / 시간 변경 배지) + 추가·수정 바텀시트(쉬는 날 토글, 여는·닫는 시간, 브레이크타임), 수정 시 삭제
  - `PAST_BUSINESS_DATE`, `BUSINESS_HOUR_HAS_RESERVATIONS`, `BUSINESS_HOUR_HAS_WAITINGS` 를 안내 문구로 변환
  - 진입: 매장 홈 ListItem, 영업시간 관리 하단 ListItem
- **예약 정책 관리** — 칩 → 스테퍼, 예약금 섹션(`GET·PUT /deposit-policy`): 예약금 받기 토글, 1건당 금액, 환불 정책 칩(유연/일반/엄격) + 환불 비율 표
- **예약 상세 팝업** — 예약 카드 본문을 누르면 바텀시트(상태 배지, 고객, 시간 카드, 테이블·예약번호·이용 시간·방문/취소/노쇼 시각, 사유, 방문 확인/변경/취소/노쇼 처리)
- 영업시간 관리 안내 문구: "이미 받은 예약이나 웨이팅과 겹치는 시간으로는 바꿀 수 없어요."
- 매장 홈: "특정일 휴무, 영업 변경", "매장 정보 수정" 항목, 오늘이 특정일이면 영업시간 값에 반영

## 공통
- `Stepper` 에 `step`, `format` prop 추가
- entities/store: `SpecialBusinessDay`, `RefundPolicy`, `REFUND_POLICY_LABEL`, `REFUND_POLICY_RULES`, `DepositPolicy`

## 목(MSW)
- StoreRow 에 `specialDays`, `deposit` 추가 (저장 키 v5), 2번 매장에 특정일 2건 시드
- `openingWindow` 가 특정일을 요일별 영업보다 우선 적용
- 예약금은 `depositOf(storeId)` 로 통일 (점주 저장값 우선, 없으면 MOCK_DEPOSIT_STORES)
- 매장 PATCH, 특정일 CRUD(지난 날짜·확정 예약·진행 중 웨이팅 충돌), 예약금 정책 GET/PUT

## 남은 것
- 예약 상세의 요청 시각, 확정 시각, 예약금, 요청사항은 점주 예약 응답에 없어 표시하지 않음 (백엔드 필드 추가 필요)
- 실제 백엔드 연동 확인 전 (MSW 로만 확인)
