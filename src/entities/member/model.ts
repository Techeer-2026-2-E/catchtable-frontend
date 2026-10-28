/** [목 전용] 회원 유형 — 인증 API(보류) 확정 시 맞춰서 수정 */
export type UserType = 'CUSTOMER' | 'OWNER'

/** 회원 정보 — 백엔드 MemberResponse { id, name, phone } (GET·PATCH /api/user/members/me) */
export interface MemberProfile {
  id: number
  name: string
  phone: string
  /** [목 전용] */
  email?: string
}

/**
 * 로그인한 회원 — 프로필 + 회원 유형
 * userType 은 로그인 응답(노션 auth 명세, 보류)에서 받는 값으로 가정. 실제 백엔드 연동 중에는 개발용 로그인에서 지정
 */
export interface Member extends MemberProfile {
  userType: UserType
}

/** [목 전용] 알림 수신 설정 (P2) — PATCH /api/user/members/me/notification-settings 제안 */
export interface NotificationSettings {
  reservation: boolean
  waiting: boolean
  marketing: boolean
}
