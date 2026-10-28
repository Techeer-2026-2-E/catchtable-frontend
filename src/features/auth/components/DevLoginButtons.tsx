import { useNavigate } from 'react-router'
import { isFeatureAvailable } from '@/shared/config'
import { getErrorMessage } from '@/shared/lib'
import { ROUTES } from '@/shared/config'
import { Button, toast } from '@/shared/ui'
import { useLogin, useMemberLogin } from '../hooks/useAuthMutations'

/** 목 API 시드 계정 (src/mocks/db.ts) */
const DEMO_ACCOUNTS = {
  customer: { email: 'catch@example.com', password: 'password1!' },
  owner: { email: 'owner@example.com', password: 'password1!' },
}

/** 실제 백엔드 로컬 시드 회원 (catchtable-backend scripts/local-seed.sql) */
const BACKEND_SEED_MEMBERS = {
  customer: { memberId: 1, userType: 'CUSTOMER' },
  owner: { memberId: 2, userType: 'OWNER' },
} as const

/**
 * 개발용 — 데모 계정으로 바로 로그인 (DEV 빌드에서만 노출)
 * 인증 API 가 없는 실제 백엔드에서는 시드 회원 id 로 식별(X-Member-Id)
 * TODO(인증 API 확정 후): 실제 계정 정책이 정해지면 제거
 */
export function DevLoginButtons() {
  const navigate = useNavigate()
  const login = useLogin()
  const memberLogin = useMemberLogin()
  const pending = login.isPending || memberLogin.isPending

  if (!import.meta.env.DEV) return null

  const run = (who: keyof typeof DEMO_ACCOUNTS) => {
    const options = {
      onSuccess: () => navigate(who === 'owner' ? ROUTES.OWNER : ROUTES.HOME, { replace: true }),
      onError: (e: unknown) => toast(getErrorMessage(e, '회원 정보를 불러오지 못했어요. 백엔드가 켜져 있는지 확인해주세요')),
    }
    if (isFeatureAvailable('auth')) login.mutate(DEMO_ACCOUNTS[who], options)
    else memberLogin.mutate(BACKEND_SEED_MEMBERS[who], options)
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <Button variant="outline" size="S" disabled={pending} onClick={() => run('customer')}>
        고객으로 둘러보기
      </Button>
      <Button variant="outline" size="S" disabled={pending} onClick={() => run('owner')}>
        점주로 둘러보기
      </Button>
    </div>
  )
}
