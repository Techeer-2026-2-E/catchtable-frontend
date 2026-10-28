import { env } from './env'

/**
 * 백엔드 dev 에 아직 API 가 없는 기능 목록 — 확인 기준: catchtable-backend dev@7d32049 (2026-10-29)
 *
 * 목 API 모드에서는 모두 켜지고, 실제 백엔드 모드(env.backendOnly)에서는 false 인 기능의
 * 화면 입구를 숨기거나 "준비 중" 으로 표시해 404 를 부르지 않는다.
 * 백엔드에 API 가 생기면 해당 값을 true 로 바꾸고 API 계약을 다시 대조한다.
 */
const BACKEND_SUPPORTS = {
  /** 로그인·회원가입·토큰 재발급 (/api/user/auth/*) — 현재는 X-Member-Id 헤더로 회원 식별 */
  auth: false,
  /** 알림함 목록·읽음 (/api/user/notifications) — 실시간 구독(SSE)은 있음 */
  notificationInbox: false,
  /** 알림 수신 설정 */
  notificationSettings: false,
  /** 회원 탈퇴 */
  withdraw: false,
  /** 주변·인기 매장 (/api/user/stores/home) */
  homeStores: false,
  /** 점주 내 매장 목록 (/api/owner/stores) */
  ownerStoreList: false,
  /** 메뉴 삭제 (DELETE /api/owner/stores/{id}/menus/{menuId}) */
  menuDelete: false,
  /** 메뉴 사진·품절 */
  menuExtras: false,
  /** 매출 조회 */
  sales: false,
  /** 점주 리뷰 목록·답글 */
  ownerReviews: false,
  /** 리뷰 작성 가능 방문 목록 */
  reviewWritable: false,
  /** 리뷰 사진 업로드 (백엔드는 http(s) URL 1개만 받음, 업로드 API 없음) */
  reviewPhotoUpload: false,
  /** 고객 순번 미루기 */
  waitingDefer: false,
  /** 점주 호출 재전송·순서 미루기 */
  waitingRecall: false,
  /** 착석 처리 후 다음 고객 자동 호출 설정 */
  waitingAutoCall: false,
  /** 예약금 결제 준비·승인 (/api/user/payments/prepare·confirm) */
  depositPayment: false,
  /** 환불 예상액 */
  refundPreview: false,
} as const

export type BackendFeature = keyof typeof BACKEND_SUPPORTS

/** 이 기능의 API 를 지금 호출할 수 있는지 */
export const isFeatureAvailable = (feature: BackendFeature) => !env.backendOnly || BACKEND_SUPPORTS[feature]
