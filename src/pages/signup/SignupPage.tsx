import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import type { UserType } from '@/entities'
import { ROUTES } from '@/shared/config'
import { formatPhone } from '@/shared/lib/format'
import { Button, Chip, ChipGroup, Page, TextField, toast, TopBar } from '@/shared/ui'
import styles from '../login/AuthPage.module.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^01[016789]\d{7,8}$/

type Field = 'name' | 'email' | 'password' | 'passwordConfirm' | 'phone'

export function SignupPage() {
  const navigate = useNavigate()
  const [userType, setUserType] = useState<UserType>('CUSTOMER')
  const [values, setValues] = useState<Record<Field, string>>({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
    phone: '',
  })
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [agreed, setAgreed] = useState(false)

  const phoneDigits = values.phone.replace(/\D/g, '')
  const errors: Partial<Record<Field, string>> = {
    name: values.name.trim() ? undefined : '이름을 입력해주세요',
    email: EMAIL_RE.test(values.email) ? undefined : '이메일 형식을 확인해주세요',
    password: values.password.length >= 8 ? undefined : '8자 이상 입력해주세요',
    passwordConfirm: values.password === values.passwordConfirm ? undefined : '비밀번호가 일치하지 않아요',
    phone: PHONE_RE.test(phoneDigits) ? undefined : '휴대폰 번호를 확인해주세요',
  }
  const valid = agreed && Object.values(errors).every((e) => !e)

  const bind = (field: Field) => ({
    value: values[field],
    onChange: (e: ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [field]: e.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [field]: true })),
    error: touched[field] ? errors[field] : undefined,
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched({ name: true, email: true, password: true, passwordConfirm: true, phone: true })
    if (!valid) return
    // TODO(API 연동): useSignup().mutate({ name, email, password, phone }) — 회원 유형 전달 방식 백엔드 확인 필요
    toast('가입이 완료됐어요. 로그인해주세요')
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <Page>
      <TopBar title="회원가입" />
      <form className={styles.container} onSubmit={submit} noValidate>
        <div>
          <p className={styles.fieldLabel}>회원 유형</p>
          <ChipGroup label="회원 유형">
            <Chip selected={userType === 'CUSTOMER'} onClick={() => setUserType('CUSTOMER')}>
              고객
            </Chip>
            <Chip selected={userType === 'OWNER'} onClick={() => setUserType('OWNER')}>
              점주
            </Chip>
          </ChipGroup>
        </div>
        <TextField label="이름" autoComplete="name" placeholder="김캐치" {...bind('name')} />
        <TextField label="이메일" type="email" autoComplete="email" placeholder="catch@example.com" {...bind('email')} />
        <TextField
          label="비밀번호"
          type="password"
          autoComplete="new-password"
          placeholder="8자 이상"
          {...bind('password')}
        />
        <TextField
          label="비밀번호 확인"
          type="password"
          autoComplete="new-password"
          placeholder="비밀번호 다시 입력"
          {...bind('passwordConfirm')}
        />
        <TextField
          label="휴대폰 번호"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="010-0000-0000"
          {...bind('phone')}
          value={formatPhone(values.phone)}
          helperText="예약·웨이팅 알림을 받을 번호예요"
        />
        <label className={styles.agree}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          [필수] 이용약관 및 개인정보 처리방침에 동의해요
        </label>
        <Button type="submit" fullWidth disabled={!valid}>
          가입하기
        </Button>
      </form>
    </Page>
  )
}
