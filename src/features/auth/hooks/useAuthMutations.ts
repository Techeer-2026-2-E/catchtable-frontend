import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/authApi'
import { useAuthStore } from '../store/authStore'

/** 회원 id 로 시작 (X-Member-Id) */
export function useStartAs() {
  const setMember = useAuthStore((s) => s.setMember)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authApi.startAs,
    onSuccess: (member) => {
      // 다른 회원으로 바꿀 때 이전 회원 데이터가 보이지 않도록
      queryClient.clear()
      setMember(member)
    },
  })
}

/** 다른 회원으로 바꾸기 — 서버 호출 없이 저장된 회원 id 만 지움 */
export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const queryClient = useQueryClient()
  return () => {
    clearAuth()
    queryClient.clear()
  }
}
