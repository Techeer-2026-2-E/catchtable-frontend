import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/authApi'
import { useAuthStore } from '../store/authStore'

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ accessToken, member }) => {
      // 다른 계정으로 로그인할 때 이전 계정 데이터가 보이지 않도록
      queryClient.clear()
      setAuth(accessToken, member)
    },
  })
}

/** [개발용] 회원 id 로 식별 (실제 백엔드 연동 중, 인증 API 가 생기기 전) */
export function useMemberLogin() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authApi.memberLogin,
    onSuccess: ({ accessToken, member }) => {
      queryClient.clear()
      setAuth(accessToken, member)
    },
  })
}

export function useSignup() {
  return useMutation({ mutationFn: authApi.signup })
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clearAuth()
      queryClient.clear()
    },
  })
}
