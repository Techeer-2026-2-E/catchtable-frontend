# 2026-11-09 고객 결제, 알림, 기타 (와이어프레임 → 코드, 묶음 5)

브랜치: `feat/customer-payment-etc` (origin/dev 기준)

## 추가·변경
- **결제 내역**: 회색 바탕 카드 목록, 날짜, 상태 배지(결제 완료 / 부분 환불 / 환불 완료 / 환불 필요), 환불액 표시, 안내 문구
- **결제 상세**: 주문명 + 배지, 큰 금액, 남은 결제 금액, 정보 카드(예약 링크, 결제 수단 "토스페이먼츠", 승인 시각, 줄인 주문번호),
  환불 내역 카드, 테스트 결제 안내. 하단 "영수증 보기" / "부분 환불 요청"
  - 확정 안 된 결제: "환불 필요" 배지, 예약 상태 "확정 안 됨", "N원 전액 환불 요청" (기존 미확정 환불 로직 유지)
- **영수증** `/payments/:id/receipt`: 결제 상세 응답으로 그린 앱 안 영수증, receiptUrl 이 있으면 Toss 영수증 링크
- **부분 환불 요청** `/payments/:id/refund`: POST /api/user/payments/{id}/cancel { cancelReason, cancelAmount } + Idempotency-Key
  - 한도는 환불 예상(refund-preview)의 refundableAmount, 빠른 금액 칩, 사유 500자
  - 서버가 거절(4xx)하면 키를 버리고, 결과를 모르면 키를 보관한 채 결제 상세로 이동
- **알림 설정** `/mypage/notification-settings`: GET·PUT /api/user/members/me/notification-settings, 토글 즉시 저장(실패 시 되돌림), MY 메뉴 추가
- **웨이팅 신청 영업시간 밖**: 요일별 영업시간(브레이크·새벽 마감 반영)으로 판단해 안내 배너 + "영업시간에 신청할 수 있어요" 비활성 버튼,
  서버 `WAITING_OUTSIDE_BUSINESS_HOURS` 도 같은 문구로 안내
- entities: `RefundResult`, `NotificationSettings`, `getPaymentBadge`, `getOpenState`, `describeNextOpen`

## 목(MSW)
- 김캐치 예약금 결제 4건 시드(결제 완료, 부분 환불, 환불 완료, 확정 안 된 결제), 저장 키 v6
- 부분 환불, 알림 설정 핸들러, 웨이팅 신청 영업시간 검사

## 테스트
- tests/openState.test.ts 추가 (영업 중, 오픈 전, 브레이크, 새벽 마감, 주말 휴무)
- tests/unconfirmedRefund.test.tsx: 버튼 이름 변경("N원 전액 환불 요청", "영수증 보기")에 맞춤

## 남은 것
- 와이어프레임의 웨이팅 신청 "지금 기다리는 팀" 카드는 고객용 대기 현황 API 가 없어 넣지 않음
- 특정일 휴무는 고객 매장 상세에 없어 화면 판단에 반영 안 됨 (서버 응답으로 안내)
- MSW 로만 확인
