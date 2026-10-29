import { http, HttpResponse } from 'msw'
import type { MemberProfile } from '@/entities'
import type { MemberRow } from '../db'
import { findMember } from '../logic'
import { API, badRequest, before, body, fail, memberIdOf, notFound, saved, unauthorized } from '../utils'

const toProfile = (m: MemberRow): MemberProfile => ({ id: m.id, name: m.name, phone: m.phone })
const PHONE = /^01[016789]-\d{3,4}-\d{4}$/

/** 내 정보 조회·수정 — 백엔드 MemberController (고객만 허용) */
function customerOf(request: Request) {
  const id = memberIdOf(request)
  if (!id) return { error: unauthorized() }
  const member = findMember(id)
  if (!member) return { error: notFound('MEMBER_NOT_FOUND', '회원을 찾을 수 없습니다.') }
  if (member.userType !== 'CUSTOMER') return { error: fail(403, 'FORBIDDEN_MEMBER_TYPE', '이 기능을 사용할 수 없는 회원 유형입니다.') }
  return { member }
}

export const memberHandlers = [
  http.get(`${API}/user/members/me`, async ({ request }) => {
    await before()
    const found = customerOf(request)
    if ('error' in found) return found.error
    return HttpResponse.json(toProfile(found.member))
  }),

  http.patch(`${API}/user/members/me`, async ({ request }) => {
    await before()
    const found = customerOf(request)
    if ('error' in found) return found.error
    const b = await body<{ name: string; phone: string }>(request)
    if (b.name !== undefined && (!b.name.trim() || b.name.length > 50)) return badRequest('이름을 확인해주세요.')
    if (b.phone !== undefined && !PHONE.test(b.phone)) return badRequest('휴대폰 번호 형식이 올바르지 않습니다.')
    if (b.name !== undefined) found.member.name = b.name.trim()
    if (b.phone !== undefined) found.member.phone = b.phone
    return saved(HttpResponse.json(toProfile(found.member)))
  }),
]
