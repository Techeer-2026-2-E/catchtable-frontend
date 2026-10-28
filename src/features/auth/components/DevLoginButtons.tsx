import { useNavigate } from 'react-router'
import { getErrorMessage } from '@/shared/lib'
import { ROUTES } from '@/shared/config'
import { Button, toast } from '@/shared/ui'
import { useLogin } from '../hooks/useAuthMutations'

/** 목 API 시드 계정 (src/mocks/db.ts) */
const DEMO_ACCOUNTS = {
  customer: { email: 'catch@example.com', password: 'password1!' },
  owner: { email: 'owner@example.com', password: 'password1!' },
}

/**
 * 개발용 — 데모 계정으로 바로 로그인 (DEV 빌드에서만 노출)
 * TODO(인증 API 확정 후): 실제 계정 정책이 정해지면 제거
 */
export function DevLoginButtons() {
  const navigate = useNavigate()
  const login = useLogin()

  if (!import.meta.env.DEV) return null

  const run = (who: keyof typeof DEMO_ACCOUNTS) =>
    login.mutate(DEMO_ACCOUNTS[who], {
      onSuccess: () => navigate(who === 'owner' ? ROUTES.OWNER : ROUTES.HOME, { replace: true }),
      onError: (e) => toast(getErrorMessage(e)),
    })

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <Button variant="outline" size="S" disabled={login.isPending} onClick={() => run('customer')}>
        고객으로 둘러보기
      </Button>
      <Button variant="outline" size="S" disabled={login.isPending} onClick={() => run('owner')}>
        점주로 둘러보기
      </Button>
    </div>
  )
}
