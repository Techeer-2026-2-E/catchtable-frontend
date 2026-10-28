import type { ReactNode } from 'react'
import { BellOff, BellRing, CalendarCheck, CalendarClock, CalendarX, ListOrdered, TimerOff, UserX } from 'lucide-react'
import { useNavigate } from 'react-router'
import type { Notification, NotificationType } from '@/entities'
import { useLiveNotificationStore, useNotifications, useReadNotification } from '@/features/notification'
import { isFeatureAvailable, paths } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { Banner, Button, EmptyState, ErrorState, LoadingState, Page, TopBar } from '@/shared/ui'
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
const linkOf = (n: Notification) =>
  n.type.startsWith('WAITING') ? paths.waiting(n.targetId) : paths.reservationDetail(n.targetId)

/**
 * 기능명세「예약·웨이팅 상태 변경 알림」
 * 알림함 API 가 없는 백엔드에서는 이번 접속 중 실시간(SSE)으로 받은 알림만 보여줌
 */
export function NotificationsPage() {
  const navigate = useNavigate()
  const hasInbox = isFeatureAvailable('notificationInbox')
  const inbox = useNotifications()
  const live = useLiveNotificationStore((s) => s.items)
  const items = hasInbox ? (inbox.data ?? []) : live
  const isPending = hasInbox && inbox.isPending
  const isError = hasInbox && inbox.isError
  const refetch = inbox.refetch
  const { read, readAll } = useReadNotification()
  const unread = items.filter((n) => !n.read).length

  const open = (n: Notification) => {
    if (!n.read && hasInbox) read.mutate(n.id)
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
      {!hasInbox && (
        <div className={styles.notice}>
          <Banner tone="info">알림함은 준비 중이에요. 지금 접속해 있는 동안 받은 실시간 알림만 보여요.</Banner>
        </div>
      )}
      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={<BellOff />} title="새 알림이 없어요" description="예약·웨이팅 상태가 바뀌면 알려드릴게요" />
      ) : (
        <ul className={styles.list}>
          {items.map((n) => (
            <li key={String(n.id)}>
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
