import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { MemberProfile } from '@/entities'
import { useAuthStore } from '@/features/auth'
import { useMe, useUpdateMe } from '@/features/member'
import { getErrorMessage } from '@/shared/lib'
import { formatPhone } from '@/shared/lib/format'
import { Button, ErrorState, LoadingState, Page, TextField, toast, TopBar } from '@/shared/ui'
import styles from './ProfileEditPage.module.css'

const NAME_MAX = 50
/** 백엔드 MemberUpdateRequest 패턴 */
const PHONE_PATTERN = /^01[016789]-\d{3,4}-\d{4}$/

/** 기능명세「이름·연락처 설정」 — GET/PATCH /api/user/members/me */
export function ProfileEditPage() {
  const { data: me, isPending, isError, refetch } = useMe()

  return (
    <Page>
      <TopBar title="이름, 연락처 설정" />
      {isPending ? <LoadingState /> : isError ? <ErrorState onRetry={() => refetch()} /> : <ProfileForm me={me} />}
    </Page>
  )
}

function ProfileForm({ me }: { me: MemberProfile }) {
  const navigate = useNavigate()
  const { member, setMember } = useAuthStore()
  const update = useUpdateMe()
  const [name, setName] = useState(me.name)
  const [phone, setPhone] = useState(formatPhone(me.phone))

  const trimmed = name.trim()
  const nameError = !trimmed ? '이름을 입력해주세요' : trimmed.length > NAME_MAX ? `${NAME_MAX}자 이내로 입력해주세요` : undefined
  const phoneError = PHONE_PATTERN.test(phone) ? undefined : '010-1234-5678 형식으로 입력해주세요'
  const changed = trimmed !== me.name || phone !== formatPhone(me.phone)

  const save = () =>
    update.mutate(
      { name: trimmed, phone },
      {
        onSuccess: (updated) => {
          // 로그인 응답에만 있는 email·userType 은 유지
          if (member) setMember({ ...member, ...updated })
          toast('저장했어요')
          navigate(-1)
        },
        onError: (e) => toast(getErrorMessage(e, '저장하지 못했어요')),
      },
    )

  return (
    <div className={styles.form}>
      <TextField label="이름" value={name} onChange={(e) => setName(e.target.value)} error={name ? nameError : undefined} />
      <TextField
        label="휴대폰 번호"
        type="tel"
        inputMode="numeric"
        value={phone}
        onChange={(e) => setPhone(formatPhone(e.target.value))}
        error={phone ? phoneError : undefined}
      />
      <Button fullWidth disabled={!!nameError || !!phoneError || !changed || update.isPending} onClick={save}>
        {update.isPending ? '저장 중…' : '저장'}
      </Button>
    </div>
  )
}
