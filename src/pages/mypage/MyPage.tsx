import { useState } from 'react'
import { Bell, ChevronRight, CreditCard, Star, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { MOCK_MEMBER } from '@/entities/mock'
import { useAuthStore } from '@/features/auth'
import { ROUTES } from '@/shared/config'
import { formatPhone } from '@/shared/lib/format'
import { Avatar, Dialog, Divider, ListItem, Page, toast, Toggle, TopBar } from '@/shared/ui'
import styles from './MyPage.module.css'

/** MY — 회원정보 설정 */
export function MyPage() {
  const navigate = useNavigate()
  // TODO(API 연동): useMe()
  const member = useAuthStore((s) => s.member) ?? MOCK_MEMBER
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const [notify, setNotify] = useState(true)
  const [logoutOpen, setLogoutOpen] = useState(false)

  return (
    <Page>
      <TopBar title="MY" leading="none" large />

      <Link to={ROUTES.PROFILE_EDIT} className={styles.profile}>
        <Avatar name={member.name} size={56} />
        <div className={styles.profileText}>
          <p className="t-title-18">{member.name}</p>
          <p className="t-caption-13 text-tertiary">{formatPhone(member.phone)}</p>
        </div>
        <ChevronRight className={styles.chevron} aria-hidden />
      </Link>

      <Divider thick />
      <p className={`${styles.groupTitle} t-caption-13 text-tertiary`}>계정</p>
      <ListItem icon={<UserRound />} title="이름 · 연락처 설정" to={ROUTES.PROFILE_EDIT} />
      {/* P2: 알림 수신 설정 */}
      <ListItem
        icon={<Bell />}
        title="알림 수신 설정"
        description="예약·웨이팅 상태 변경 알림"
        trailing={
          <Toggle
            checked={notify}
            label="알림 수신"
            onChange={(v) => {
              setNotify(v)
              toast(v ? '알림을 받을게요' : '알림을 끌게요')
            }}
          />
        }
      />
      {/* P2: 고객 리뷰 관리 */}
      <ListItem icon={<Star />} title="리뷰 관리" onClick={() => toast('리뷰 관리는 준비 중이에요')} />
      <Divider thick />
      <ListItem icon={<CreditCard />} title="결제수단 관리" onClick={() => toast('결제수단 관리는 준비 중이에요')} />
      <Divider thick />

      <div className={styles.footer}>
        <button type="button" className="t-body-14 text-secondary" onClick={() => setLogoutOpen(true)}>
          로그아웃
        </button>
        {/* P2(보류): 회원 탈퇴 */}
        <button type="button" className="t-caption-13 text-tertiary" onClick={() => toast('회원 탈퇴는 준비 중이에요')}>
          회원 탈퇴
        </button>
      </div>

      <Dialog
        isOpen={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title="로그아웃할까요?"
        confirmLabel="로그아웃"
        cancelLabel="취소"
        onConfirm={() => {
          // TODO(API 연동): useLogout()
          clearAuth()
          navigate(ROUTES.HOME, { replace: true })
        }}
      />
    </Page>
  )
}
