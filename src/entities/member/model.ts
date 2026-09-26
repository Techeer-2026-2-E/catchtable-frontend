/** 백엔드 member.entity.UserType */
export type UserType = 'CUSTOMER' | 'OWNER'

export interface Member {
  id: number
  email: string
  name: string
  phone: string
  userType: UserType
}
