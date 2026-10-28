import { delay, HttpResponse } from 'msw'
import { env } from '@/shared/config'
import { persist } from './db'
import { tick } from './logic'

/** 핸들러 경로 앞부분 — 실제 요청과 같은 /api */
export const API = env.apiBaseUrl

/** 백엔드 ErrorResponse { code, message } 형식의 오류 응답 */
export const fail = (status: number, code: string, message: string) =>
  HttpResponse.json({ code, message }, { status })

export const notFound = (code: string, message: string) => fail(404, code, message)
export const conflict = (code: string, message: string) => fail(409, code, message)
export const badRequest = (message: string, code = 'INVALID_INPUT') => fail(400, code, message)

/**
 * 로그인 회원 id — 백엔드처럼 X-Member-Id 헤더로 식별
 * 없으면 백엔드와 같은 401 UNAUTHORIZED
 */
export function memberIdOf(request: Request): number | null {
  const header = request.headers.get('X-Member-Id')
  const id = header ? Number(header) : NaN
  return Number.isFinite(id) ? id : null
}

export const unauthorized = () => fail(401, 'UNAUTHORIZED', '회원 식별 정보가 없습니다.')

/** 실제 네트워크처럼 약간의 지연 + 시간 흐름(자동 이용 완료·만료) 반영 */
export async function before() {
  await delay(120 + Math.round(Math.random() * 180))
  tick()
}

/** 변경 요청 후 저장 */
export function saved<T>(response: T): T {
  persist()
  return response
}

export async function body<T>(request: Request): Promise<Partial<T>> {
  try {
    return (await request.json()) as Partial<T>
  } catch {
    return {}
  }
}
