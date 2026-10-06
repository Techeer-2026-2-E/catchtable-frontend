import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { DevLoginButtons, useLogin } from '@/features/auth'
import { getErrorMessage } from '@/shared/lib'
import { ROUTES } from '@/shared/config'
import { Button, Page, TextField, toast, TopBar } from '@/shared/ui'
import styles from './AuthPage.module.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation() as { state: { from?: { pathname: string } } | null }
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState(false)

  const emailError = touched && !EMAIL_RE.test(email) ? '이메일 형식을 확인해주세요' : undefined
  const canSubmit = EMAIL_RE.test(email) && password.length > 0

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!canSubmit) return
    login.mutate(
      { email, password },
      {
        onSuccess: ({ member }) => {
          toast(`${member.name}님, 반가워요`)
          const fallback = member.userType === 'OWNER' ? ROUTES.OWNER : ROUTES.HOME
          navigate(location.state?.from?.pathname ?? fallback, { replace: true })
        },
        onError: (err) => toast(getErrorMessage(err, '로그인하지 못했어요')),
      },
    )
  }

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

        <form className={styles.form} onSubmit={submit} noValidate>
          <TextField
            label="이메일"
            type="email"
            autoComplete="email"
            placeholder="catch@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => email && setTouched(true)}
            error={emailError}
          />
          <TextField
            label="비밀번호"
            type="password"
            autoComplete="current-password"
            placeholder="비밀번호 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" fullWidth disabled={!canSubmit || login.isPending}>
            {login.isPending ? '로그인 중…' : '로그인'}
          </Button>
        </form>

        <div className={styles.divider}>
          <span>또는 간편 로그인</span>
        </div>
        {/* 소셜 로그인 — 명세 범위 밖, UI 자리만 */}
        <div className={styles.social}>
          {['카카오', 'Apple', 'Google'].map((p) => (
            <Button key={p} variant="outline" fullWidth onClick={() => toast(`${p} 로그인은 준비 중이에요`)}>
              {p}로 시작하기
            </Button>
          ))}
        </div>

        <p className={`${styles.footer} t-caption-13 text-tertiary`}>
          아직 회원이 아니신가요?{' '}
          <Link to={ROUTES.SIGNUP} className="text-brand">
            <strong>회원가입</strong>
          </Link>
        </p>
        <div className={styles.dev}>
          <DevLoginButtons />
        </div>
      </div>
    </Page>
  )
}
