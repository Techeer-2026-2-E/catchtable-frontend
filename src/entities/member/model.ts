/** 회원 유형 — 백엔드 member.user_type (인증 API 가 없어 로그인 시 화면에서 지정) */
export type UserType = 'CUSTOMER' | 'OWNER'

/** 회원 정보 — 백엔드 MemberResponse { id, name, phone } (GET·PATCH /api/user/members/me) */
export interface MemberProfile {
  id: number
  name: string
  phone: string
}

/**
 * 로그인한 회원 — 프로필 + 회원 유형
 * 인증 API 가 없어 시작 화면에서 고른 회원 id 를 X-Member-Id 헤더로 보냄
 */
export interface Member extends MemberProfile {
  userType: UserType
}
