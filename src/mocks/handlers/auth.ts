import { http, HttpResponse } from 'msw'
import type { Member, NotificationSettings, UserType } from '@/entities'
import { db, nextId, type MemberRow } from '../db'
import { findMember } from '../logic'
import { API, badRequest, before, body, conflict, fail, memberIdOf, notFound, saved, unauthorized } from '../utils'

const toMember = (m: MemberRow): Member => ({ id: m.id, name: m.name, phone: m.phone, email: m.email, userType: m.userType })
const PHONE = /^01[016789]-\d{3,4}-\d{4}$/

/** 인증(노션 명세 보류) + 회원(백엔드 dev 구현) */
export const authHandlers = [
  http.post(`${API}/user/auth/signup`, async ({ request }) => {
    await before()
    const b = await body<{ email: string; password: string; name: string; phone: string; userType: UserType }>(request)
    if (!b.email || !b.password || !b.name || !b.phone) return badRequest('필수 입력값이 비어 있습니다.')
    if (!PHONE.test(b.phone)) return badRequest('휴대폰 번호 형식이 올바르지 않습니다.')
    if (db.members.some((m) => m.email === b.email)) return conflict('DUPLICATE_EMAIL', '이미 가입된 이메일입니다.')
    db.members.push({
      id: nextId('member'),
      email: b.email,
      password: b.password,
      name: b.name,
      phone: b.phone,
      userType: b.userType ?? 'CUSTOMER',
      notificationSettings: { reservation: true, waiting: true, marketing: false },
    })
    return saved(new HttpResponse(null, { status: 201 }))
  }),

  http.post(`${API}/user/auth/login`, async ({ request }) => {
    await before()
    const b = await body<{ email: string; password: string }>(request)
    const member = db.members.find((m) => m.email === b.email)
    if (!member || member.password !== b.password) {
      return fail(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다.')
    }
    return HttpResponse.json({ accessToken: `mock-token-${member.id}`, member: toMember(member) })
  }),

  http.post(`${API}/user/auth/reissue`, async ({ request }) => {
    const id = memberIdOf(request)
    if (!id) return unauthorized()
    return HttpResponse.json({ accessToken: `mock-token-${id}-${Date.now()}` })
  }),

  http.post(`${API}/user/auth/logout`, async () => {
    await before()
    return new HttpResponse(null, { status: 204 })
  }),

  /* ---------- 회원 ---------- */
  http.get(`${API}/user/members/me`, async ({ request }) => {
    await before()
    const id = memberIdOf(request)
    if (!id) return unauthorized()
    const member = findMember(id)
    if (!member) return notFound('MEMBER_NOT_FOUND', '회원을 찾을 수 없습니다.')
    // 백엔드 MemberResponse 는 { id, name, phone } — 목은 email·userType 도 함께
    return HttpResponse.json(toMember(member))
  }),

  http.patch(`${API}/user/members/me`, async ({ request }) => {
    await before()
    const id = memberIdOf(request)
    if (!id) return unauthorized()
    const member = findMember(id)
    if (!member) return notFound('MEMBER_NOT_FOUND', '회원을 찾을 수 없습니다.')
    const b = await body<{ name: string; phone: string }>(request)
    if (b.name !== undefined && (!b.name.trim() || b.name.length > 50)) return badRequest('이름을 확인해주세요.')
    if (b.phone !== undefined && !PHONE.test(b.phone)) return badRequest('휴대폰 번호 형식이 올바르지 않습니다.')
    if (b.name !== undefined) member.name = b.name.trim()
    if (b.phone !== undefined) member.phone = b.phone
    return saved(HttpResponse.json(toMember(member)))
  }),

  http.delete(`${API}/user/members/me`, async ({ request }) => {
    await before()
    const id = memberIdOf(request)
    if (!id) return unauthorized()
    db.members = db.members.filter((m) => m.id !== id)
    return saved(new HttpResponse(null, { status: 204 }))
  }),

  /* P2 · 경로 제안: 알림 수신 설정 */
  http.get(`${API}/user/members/me/notification-settings`, async ({ request }) => {
    await before()
    const member = findMember(memberIdOf(request) ?? -1)
    if (!member) return unauthorized()
    return HttpResponse.json(member.notificationSettings)
  }),

  http.patch(`${API}/user/members/me/notification-settings`, async ({ request }) => {
    await before()
    const member = findMember(memberIdOf(request) ?? -1)
    if (!member) return unauthorized()
    const b = await body<NotificationSettings>(request)
    member.notificationSettings = { ...member.notificationSettings, ...b }
    return saved(HttpResponse.json(member.notificationSettings))
  }),
]
