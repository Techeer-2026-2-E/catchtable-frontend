/** [목 전용] 회원 유형 — 인증 API(보류) 확정 시 맞춰서 수정 */
export type UserType = 'CUSTOMER' | 'OWNER'

/**
 * 회원 — 백엔드 MemberResponse { id, name, phone } 기준
 * email·userType 은 로그인 응답(노션 auth 명세, 보류)에서 받는 값으로 가정
 */
export interface Member {
  id: number
  name: string
  phone: string
  email?: string
  userType: UserType
}

/** [목 전용] 알림 수신 설정 (P2) — PATCH /api/user/members/me/notification-settings 제안 */
export interface NotificationSettings {
  reservation: boolean
  waiting: boolean
  marketing: boolean
}
