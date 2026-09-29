import { useNavigate } from 'react-router'
import type { Member } from '@/entities'
import { MOCK_MEMBER, MOCK_OWNER } from '@/entities/mock'
import { ROUTES } from '@/shared/config'
import { Button } from '@/shared/ui'
import { useAuthStore } from '../store/authStore'

/**
 * 개발용 — API 연동 전 로그인 없이 화면을 둘러보기 위한 버튼 (DEV 빌드에서만 노출)
 * TODO(API 연동): 로그인 API 붙으면 제거
 */
export function DevLoginButtons() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  if (!import.meta.env.DEV) return null

  const login = (member: Member, to: string) => {
    setAuth('dev-mock-token', member)
    navigate(to, { replace: true })
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <Button variant="outline" size="S" onClick={() => login(MOCK_MEMBER, ROUTES.HOME)}>
        고객으로 둘러보기
      </Button>
      <Button variant="outline" size="S" onClick={() => login(MOCK_OWNER, ROUTES.OWNER)}>
        점주로 둘러보기
      </Button>
    </div>
  )
}
