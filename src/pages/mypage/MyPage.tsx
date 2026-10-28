import { useState } from 'react'
import { ChevronRight, Star, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { useAuthStore, useLogout } from '@/features/auth'
import { useMe } from '@/features/member'
import { useMyReviews } from '@/features/review'
import { ROUTES } from '@/shared/config'
import { formatPhone } from '@/shared/lib/format'
import { Avatar, Dialog, Divider, ListItem, Page, TopBar } from '@/shared/ui'
import styles from './MyPage.module.css'

/** MY — 회원정보 (GET /api/user/members/me) */
export function MyPage() {
  const navigate = useNavigate()
  const cached = useAuthStore((s) => s.member)
  const { data: me } = useMe()
  const member = me ?? cached
  const logout = useLogout()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const reviews = useMyReviews()

  return (
    <Page>
      <TopBar title="MY" leading="none" large />

      <Link to={ROUTES.PROFILE_EDIT} className={styles.profile}>
        <Avatar name={member?.name ?? '?'} size={56} />
        <div className={styles.profileText}>
          <p className="t-title-18">{member?.name}</p>
          <p className="t-caption-13 text-tertiary">{member ? formatPhone(member.phone) : ''}</p>
        </div>
        <ChevronRight className={styles.chevron} aria-hidden />
      </Link>

      <Divider thick />
      <p className={`${styles.groupTitle} t-caption-13 text-tertiary`}>계정</p>
      <ListItem icon={<UserRound />} title="이름 · 연락처 설정" to={ROUTES.PROFILE_EDIT} />
      <ListItem icon={<Star />} title="리뷰 관리" value={reviews.data ? `${reviews.data.length}개` : undefined} to={ROUTES.MY_REVIEWS} />
      <Divider thick />

      <div className={styles.footer}>
        <button type="button" className="t-body-14 text-secondary" onClick={() => setLogoutOpen(true)}>
          다른 회원으로 시작
        </button>
      </div>

      <Dialog
        isOpen={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title="시작 화면으로 돌아갈까요?"
        confirmLabel="돌아가기"
        cancelLabel="취소"
        onConfirm={() => {
          logout()
          navigate(ROUTES.LOGIN, { replace: true })
        }}
      />
    </Page>
  )
}
