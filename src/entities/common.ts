/** 백엔드 에러 응답 (global/exception/ErrorResponse) */
export interface ErrorResponse {
  code: string
  message: string
}

/** 페이징 응답 — 백엔드 페이징 방식 확정 후 맞춰서 수정 */
export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}
