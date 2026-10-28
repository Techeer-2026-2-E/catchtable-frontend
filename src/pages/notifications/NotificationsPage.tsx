import type { ReactNode } from 'react'
import { BellOff, BellRing, CalendarCheck, CalendarX, TimerOff, UserX } from 'lucide-react'
import { useNavigate } from 'react-router'
import type { Notification, NotificationType } from '@/entities'
import { useNotifications, useReadNotification } from '@/features/notification'
import { paths } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { Button, EmptyState, ErrorState, LoadingState, Page, TopBar } from '@/shared/ui'
import styles from './NotificationsPage.module.css'

const ICON: Record<NotificationType, ReactNode> = {
  WAITING_CALLED: <BellRing aria-hidden />,
  WAITING_EXPIRED: <TimerOff aria-hidden />,
  WAITING_CANCELED: <UserX aria-hidden />,
  RESERVATION_CONFIRMED: <CalendarCheck aria-hidden />,
  RESERVATION_CANCELED: <CalendarX aria-hidden />,
}

/** 알림 종류에 따라 이동할 화면 — targetId 는 예약 id 또는 웨이팅 id */
const linkOf = (n: Notification) =>
  n.type.startsWith('WAITING') ? paths.waiting(n.targetId) : paths.reservationDetail(n.targetId)

/** 기능명세「예약·웨이팅 상태 변경 알림」 */
export function NotificationsPage() {
  const navigate = useNavigate()
  const { data: items = [], isPending, isError, refetch } = useNotifications()
  const { read, readAll } = useReadNotification()
  const unread = items.filter((n) => !n.read).length

  const open = (n: Notification) => {
    if (!n.read) read.mutate(n.id)
    navigate(linkOf(n))
  }

  return (
    <Page>
      <TopBar
        title="알림"
        leading="none"
        large
        actions={
          unread > 0 && (
            <Button variant="ghost" size="S" onClick={() => readAll.mutate()}>
              모두 읽음
            </Button>
          )
        }
      />
      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={<BellOff />} title="새 알림이 없어요" description="예약·웨이팅 상태가 바뀌면 알려드릴게요" />
      ) : (
        <ul className={styles.list}>
          {items.map((n) => (
            <li key={n.id}>
              <button type="button" className={`${styles.item} ${n.read ? '' : styles.unread}`} onClick={() => open(n)}>
                <span className={`${styles.icon} ${n.type === 'WAITING_CALLED' && !n.read ? styles.urgent : ''}`}>
                  {ICON[n.type] ?? <BellRing aria-hidden />}
                </span>
                <span className={styles.body}>
                  <span className={styles.titleRow}>
                    <span className="t-body-14-strong">{n.title}</span>
                    <span className="t-caption-12 text-tertiary">{dayjs(n.createdAt).fromNow()}</span>
                  </span>
                  <span className="t-caption-13 text-secondary">{n.message}</span>
                </span>
                {!n.read && <span className={styles.dot} aria-label="읽지 않음" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Page>
  )
}
