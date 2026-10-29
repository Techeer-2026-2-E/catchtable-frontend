import { useNavigate } from 'react-router'
import { StartAsButtons, useAuthStore } from '@/features/auth'
import { ROUTES } from '@/shared/config'
import { Page, TopBar } from '@/shared/ui'
import styles from './AuthPage.module.css'

/**
 * 시작 화면 — 백엔드에 로그인·회원가입 API 가 없어 고객·점주 시드 회원 중 하나로 시작
 * (X-Member-Id 헤더로 식별, 운영 인증 아님)
 */
export function LoginPage() {
  const navigate = useNavigate()
  const member = useAuthStore((s) => s.member)

  return (
    <Page>
      <TopBar leading="close" onLeadingClick={() => navigate(ROUTES.HOME)} />
      <div className={styles.container}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden>
            C
          </span>
          <h1 className="t-title-20">캐치테이블</h1>
          <p className="t-body-14 text-secondary">줄 서지 말고, 예약하고 기다리세요</p>
        </div>
        {member && (
          <p className="t-body-14 text-secondary">
            지금 {member.name}님({member.userType === 'OWNER' ? '점주' : '고객'})으로 이용 중이에요. 다른 회원으로 바꾸려면 아래에서
            골라주세요.
          </p>
        )}
        <div className={styles.actions}>
          <StartAsButtons />
        </div>
      </div>
    </Page>
  )
}
