import { useState } from 'react'
import { Bell, ChevronRight, CreditCard, Star, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { useAuthStore, useLogout } from '@/features/auth'
import { useMe, useNotificationSettings, useUpdateNotificationSettings } from '@/features/member'
import { useMyReviews } from '@/features/review'
import { isFeatureAvailable, ROUTES } from '@/shared/config'
import { formatPhone } from '@/shared/lib/format'
import { Avatar, Dialog, Divider, ListItem, Page, toast, Toggle, TopBar } from '@/shared/ui'
import styles from './MyPage.module.css'

/** MY — 회원정보 설정 */
export function MyPage() {
  const navigate = useNavigate()
  const cached = useAuthStore((s) => s.member)
  const { data: me } = useMe()
  const member = me ?? cached
  const logout = useLogout()
  const settings = useNotificationSettings()
  const updateSettings = useUpdateNotificationSettings()
  const notify = settings.data ? settings.data.reservation && settings.data.waiting : true
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
      {/* P2: 알림 수신 설정 — 백엔드 API 가 생기면 노출 */}
      {isFeatureAvailable('notificationSettings') && (
        <ListItem
          icon={<Bell />}
          title="알림 수신 설정"
          description="예약·웨이팅 상태 변경 알림"
          trailing={
            <Toggle
              checked={notify}
              label="알림 수신"
              disabled={settings.isPending || updateSettings.isPending}
              onChange={(v) =>
                updateSettings.mutate(
                  { reservation: v, waiting: v },
                  {
                    onSuccess: () => toast(v ? '예약·웨이팅 알림을 받을게요' : '예약·웨이팅 알림을 끌게요'),
                  },
                )
              }
            />
          }
        />
      )}
      <ListItem
        icon={<Star />}
        title="리뷰 관리"
        value={reviews.data ? `${reviews.data.length}개` : undefined}
        to={ROUTES.MY_REVIEWS}
      />
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
        onConfirm={() =>
          logout.mutate(undefined, {
            onSettled: () => navigate(ROUTES.HOME, { replace: true }),
          })
        }
      />
    </Page>
  )
}
