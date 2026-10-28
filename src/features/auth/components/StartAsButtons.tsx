import { useLocation, useNavigate } from 'react-router'
import { ROUTES } from '@/shared/config'
import { getErrorMessage } from '@/shared/lib'
import { Button, toast } from '@/shared/ui'
import { useStartAs } from '../hooks/useAuthMutations'

/** 백엔드 로컬 시드 회원 (catchtable-backend scripts/local-seed.sql) */
const SEED_MEMBERS = {
  customer: { memberId: 1, userType: 'CUSTOMER', name: '목 고객' },
  owner: { memberId: 2, userType: 'OWNER', name: '목 점주' },
} as const

/**
 * 고객·점주로 시작 — 인증 API 가 없어 시드 회원 id 를 X-Member-Id 로 사용
 * TODO(인증 API 확정 후): 로그인 화면으로 교체
 */
export function StartAsButtons() {
  const navigate = useNavigate()
  const location = useLocation() as { state: { from?: { pathname: string } } | null }
  const startAs = useStartAs()

  const run = (who: keyof typeof SEED_MEMBERS) =>
    startAs.mutate(SEED_MEMBERS[who], {
      onSuccess: () => {
        const fallback = who === 'owner' ? ROUTES.OWNER : ROUTES.HOME
        navigate(location.state?.from?.pathname ?? fallback, { replace: true })
      },
      onError: (e) => toast(getErrorMessage(e, '회원 정보를 불러오지 못했어요. 백엔드가 켜져 있는지 확인해주세요')),
    })

  return (
    <>
      <Button fullWidth disabled={startAs.isPending} onClick={() => run('customer')}>
        고객으로 시작
      </Button>
      <Button variant="outline" fullWidth disabled={startAs.isPending} onClick={() => run('owner')}>
        점주로 시작
      </Button>
    </>
  )
}
