import { isAxiosError } from 'axios'

interface ErrorBody {
  code: string
  message: string
}

/** 화면에 그대로 보여줘도 되는 오류 (API 호출 전에 프론트가 막은 경우 등) */
export class UserFacingError extends Error {
  name = 'UserFacingError'
}

/** 백엔드 ErrorResponse { code, message } 에서 사용자 메시지 추출 */
export const getErrorMessage = (error: unknown, fallback = '잠시 후 다시 시도해 주세요.') => {
  if (isAxiosError<ErrorBody>(error)) {
    return error.response?.data?.message ?? fallback
  }
  if (error instanceof UserFacingError) return error.message
  return fallback
}

export const getErrorCode = (error: unknown) =>
  isAxiosError<ErrorBody>(error) ? error.response?.data?.code : undefined
