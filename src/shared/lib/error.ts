import { isAxiosError } from 'axios'

interface ErrorBody {
  code: string
  message: string
}

/** 백엔드 ErrorResponse { code, message } 에서 사용자 메시지 추출 */
export const getErrorMessage = (error: unknown, fallback = '잠시 후 다시 시도해 주세요.') => {
  if (isAxiosError<ErrorBody>(error)) {
    return error.response?.data?.message ?? fallback
  }
  return fallback
}

export const getErrorCode = (error: unknown) =>
  isAxiosError<ErrorBody>(error) ? error.response?.data?.code : undefined
