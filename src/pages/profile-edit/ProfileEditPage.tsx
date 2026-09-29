import { useState } from 'react'
import { useNavigate } from 'react-router'
import { MOCK_MEMBER } from '@/entities/mock'
import { useAuthStore } from '@/features/auth'
import { formatPhone } from '@/shared/lib/format'
import { Banner, Button, Page, TextField, toast, TopBar } from '@/shared/ui'
import styles from './ProfileEditPage.module.css'

const NAME_MAX = 20

/** 기능명세「이름·연락처 설정」 */
export function ProfileEditPage() {
  const navigate = useNavigate()
  // TODO(API 연동): useMe(), useUpdateMe()
  const member = useAuthStore((s) => s.member) ?? MOCK_MEMBER
  const setMember = useAuthStore((s) => s.setMember)
  const [name, setName] = useState(member.name)

  const trimmed = name.trim()
  const error = trimmed.length === 0 ? '이름을 입력해주세요' : trimmed.length > NAME_MAX ? `${NAME_MAX}자 이내로 입력해주세요` : undefined
  const changed = trimmed !== member.name

  return (
    <Page
      bottom={
        <Button
          fullWidth
          disabled={!!error || !changed}
          onClick={() => {
            setMember({ ...member, name: trimmed })
            toast('저장했어요')
            navigate(-1)
          }}
        >
          저장
        </Button>
      }
    >
      <TopBar title="이름 · 연락처 설정" />
      <div className={styles.form}>
        <TextField label="이름" value={name} onChange={(e) => setName(e.target.value)} error={name ? error : undefined} maxLength={NAME_MAX + 5} />
        <TextField label="휴대폰 번호" value={formatPhone(member.phone)} readOnly helperText="인증된 번호예요" />
        <TextField label="이메일" value={member.email} readOnly />
        <Banner tone="info">휴대폰 번호 변경은 본인인증이 필요해요.</Banner>
      </div>
    </Page>
  )
}
