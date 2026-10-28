import type { ReactNode } from 'react'
import { BellOff, BellRing, CalendarCheck, CalendarClock, CalendarX, ListOrdered, TimerOff, UserX } from 'lucide-react'
import { useNavigate } from 'react-router'
import type { Notification, NotificationType } from '@/entities'
import { useLiveNotificationStore } from '@/features/notification'
import { paths } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { EmptyState, Page, TopBar } from '@/shared/ui'
import styles from './NotificationsPage.module.css'

const ICON: Record<NotificationType, ReactNode> = {
  WAITING_CALLED: <BellRing aria-hidden />,
  WAITING_EXPIRED: <TimerOff aria-hidden />,
  WAITING_CANCELED: <UserX aria-hidden />,
  RESERVATION_CONFIRMED: <CalendarCheck aria-hidden />,
  RESERVATION_CANCELED: <CalendarX aria-hidden />,
  RESERVATION_CHANGED: <CalendarClock aria-hidden />,
  WAITING_CHANGED: <ListOrdered aria-hidden />,
  WAITING_POSITION_CHANGED: <ListOrdered aria-hidden />,
}

/** 알림 종류에 따라 이동할 화면 — targetId 는 예약 id 또는 웨이팅 id */
const linkOf = (n: Notification) => (n.type.startsWith('WAITING') ? paths.waiting(n.targetId) : paths.reservationDetail(n.targetId))

/**
 * 기능명세「예약·웨이팅 상태 변경 알림」
 * 알림함 API 가 없어서 이번 접속 중 실시간(SSE, GET /api/user/notifications/subscribe)으로 받은 알림만 보여줌
 */
export function NotificationsPage() {
  const navigate = useNavigate()
  const items = useLiveNotificationStore((s) => s.items)

  return (
    <Page>
      <TopBar title="알림" leading="none" large />
      {items.length === 0 ? (
        <EmptyState icon={<BellOff />} title="새 알림이 없어요" description="접속해 있는 동안 예약·웨이팅 상태가 바뀌면 알려드릴게요" />
      ) : (
        <ul className={styles.list}>
          {items.map((n) => (
            <li key={n.id}>
              <button type="button" className={styles.item} onClick={() => navigate(linkOf(n))}>
                <span className={`${styles.icon} ${n.type === 'WAITING_CALLED' ? styles.urgent : ''}`}>{ICON[n.type]}</span>
                <span className={styles.body}>
                  <span className={styles.titleRow}>
                    <span className="t-body-14-strong">{n.title}</span>
                    <span className="t-caption-12 text-tertiary">{dayjs(n.createdAt).fromNow()}</span>
                  </span>
                  <span className="t-caption-13 text-secondary">{n.message}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Page>
  )
}
