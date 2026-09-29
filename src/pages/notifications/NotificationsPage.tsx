import type { ReactNode } from 'react'
import { BellOff, BellRing, CalendarCheck, CalendarX, ListOrdered, Star } from 'lucide-react'
import { useNavigate } from 'react-router'
import type { Notification } from '@/entities'
import { useInboxStore } from '@/features/notification'
import { dayjs } from '@/shared/lib/dayjs'
import { Button, EmptyState, Page, TopBar } from '@/shared/ui'
import styles from './NotificationsPage.module.css'

const ICON: Record<NonNullable<Notification['type']>, ReactNode> = {
  WAITING_CALLED: <BellRing aria-hidden />,
  WAITING_POSITION: <ListOrdered aria-hidden />,
  RESERVATION_CONFIRMED: <CalendarCheck aria-hidden />,
  RESERVATION_CANCELED: <CalendarX aria-hidden />,
  REVIEW_REQUEST: <Star aria-hidden />,
}

/** 기능명세「예약·웨이팅 상태 변경 알림」 */
export function NotificationsPage() {
  const navigate = useNavigate()
  const { items, read, readAll } = useInboxStore()
  const unread = items.filter((n) => !n.read).length

  const open = (n: Notification) => {
    read(n.id)
    if (n.link) navigate(n.link)
  }

  return (
    <Page>
      <TopBar
        title="알림"
        leading="none"
        large
        actions={
          unread > 0 && (
            <Button variant="ghost" size="S" onClick={readAll}>
              모두 읽음
            </Button>
          )
        }
      />
      {items.length === 0 ? (
        <EmptyState icon={<BellOff />} title="새 알림이 없어요" description="예약·웨이팅 상태가 바뀌면 알려드릴게요" />
      ) : (
        <ul className={styles.list}>
          {items.map((n) => (
            <li key={n.id}>
              <button type="button" className={`${styles.item} ${n.read ? '' : styles.unread}`} onClick={() => open(n)}>
                <span className={`${styles.icon} ${n.type === 'WAITING_CALLED' && !n.read ? styles.urgent : ''}`}>
                  {n.type ? ICON[n.type] : <BellRing aria-hidden />}
                </span>
                <span className={styles.body}>
                  <span className={styles.titleRow}>
                    <span className="t-body-14-strong">{n.title}</span>
                    <span className="t-caption-12 text-tertiary">{dayjs(n.createdAt).fromNow()}</span>
                  </span>
                  <span className="t-caption-13 text-secondary">{n.content}</span>
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
