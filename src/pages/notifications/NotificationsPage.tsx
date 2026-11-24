import { useEffect, useState, type ReactNode } from 'react'
import { BellOff, BellRing, CalendarCheck, CalendarClock, CalendarX, TimerOff, UserX, X } from 'lucide-react'
import { useNavigate } from 'react-router'
import { NOTIFICATION_TITLE, type InboxNotification, type InboxNotificationType } from '@/entities'
import { useDeleteNotification, useMarkNotificationsRead, useNotificationInbox } from '@/features/notification'
import { paths } from '@/shared/config'
import { cn } from '@/shared/lib/cn'
import { dayjs } from '@/shared/lib/dayjs'
import { Button, EmptyState, ErrorState, ListSkeleton, Page, TopBar, toast } from '@/shared/ui'
import styles from './NotificationsPage.module.css'

const ICON: Record<InboxNotificationType, ReactNode> = {
  WAITING_CALLED: <BellRing aria-hidden />,
  WAITING_EXPIRED: <TimerOff aria-hidden />,
  WAITING_CANCELED: <UserX aria-hidden />,
  RESERVATION_CONFIRMED: <CalendarCheck aria-hidden />,
  RESERVATION_CANCELED: <CalendarX aria-hidden />,
  RESERVATION_CHANGED: <CalendarClock aria-hidden />,
}

/** 알림 종류에 따라 이동할 화면 — targetId 는 예약 id 또는 웨이팅 id */
const linkOf = (n: InboxNotification) => (n.type.startsWith('WAITING') ? paths.waiting(n.targetId) : paths.reservationDetail(n.targetId))

/**
 * 알림함 — 서버에 저장된 알림 (GET /api/user/notifications, 백엔드 feat/281-notification-list)
 * - 들어오면 화면에 보인 가장 최신 알림까지 읽음 처리. 이번 방문 동안은 그 알림들을 "새 알림"으로 구분해 보여준다
 * - 오래된 알림을 자동으로 지우지 않으므로 사용자가 한 건씩 지운다
 */
export function NotificationsPage() {
  const navigate = useNavigate()
  const inbox = useNotificationInbox()
  const { mutate: markRead } = useMarkNotificationsRead()
  const remove = useDeleteNotification()

  const items = inbox.data?.pages.flatMap((p) => p.notifications) ?? []

  // 이번 방문에서 안 읽은 상태로 받은 알림 — 읽음 처리 뒤 목록을 다시 받아도 "새 알림"에 남겨 둔다
  const [freshIds, setFreshIds] = useState<ReadonlySet<number>>(() => new Set())
  const unseen = items.filter((n) => !n.read && !freshIds.has(n.id))
  if (unseen.length > 0) setFreshIds((prev) => new Set([...prev, ...unseen.map((n) => n.id)]))

  // 안 읽은 알림이 보이면 그중 가장 최신 것까지 읽음 처리 (머무는 동안 새 알림이 오면 다시)
  const newestUnread = items.reduce<number | null>((max, n) => (!n.read && (max == null || n.id > max) ? n.id : max), null)
  useEffect(() => {
    if (newestUnread != null) markRead(newestUnread)
  }, [newestUnread, markRead])

  const fresh = items.filter((n) => !n.read || freshIds.has(n.id))
  const old = items.filter((n) => n.read && !freshIds.has(n.id))

  const onDelete = (n: InboxNotification) =>
    remove.mutate(n.id, {
      onSuccess: () => toast('알림을 삭제했어요'),
      onError: () => toast('알림을 지우지 못했어요. 잠시 후 다시 시도해 주세요'),
    })

  const renderItem = (n: InboxNotification, isNew: boolean) => (
    <li key={n.id} className={cn(styles.item, isNew && styles.unread)}>
      <button type="button" className={styles.open} onClick={() => navigate(linkOf(n))}>
        <span className={cn(styles.icon, n.type === 'WAITING_CALLED' && styles.urgent)}>{ICON[n.type]}</span>
        <span className={styles.body}>
          <span className={styles.titleRow}>
            <span className={cn(isNew ? 't-body-14-strong' : 't-body-14 text-secondary', styles.title)}>{NOTIFICATION_TITLE[n.type]}</span>
            {isNew && <span className={styles.dot} aria-label="새 알림" />}
            <span className="t-caption-12 text-tertiary">{dayjs(n.createdAt).fromNow()}</span>
          </span>
          <span className={cn('t-caption-13', isNew ? 'text-secondary' : 'text-tertiary')}>{n.message}</span>
        </span>
      </button>
      <button type="button" className={styles.remove} aria-label={`${NOTIFICATION_TITLE[n.type]} 알림 삭제`} onClick={() => onDelete(n)}>
        <X aria-hidden />
      </button>
    </li>
  )

  return (
    <Page>
      <TopBar title="알림" large />
      {inbox.isPending ? (
        <ListSkeleton rows={4} thumb="small" variant="card" label="알림을 불러오는 중" />
      ) : inbox.isError ? (
        <ErrorState message="알림을 불러오지 못했어요" onRetry={() => inbox.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={<BellOff />} title="알림이 없어요" description="예약이나 웨이팅 상태가 바뀌면 여기에 모아 둘게요" />
      ) : (
        <div className={styles.content}>
          {fresh.length > 0 && (
            <section aria-labelledby="noti-new">
              <h2 id="noti-new" className={cn('t-label-13', styles.groupNew)}>
                새 알림
              </h2>
              <ul className={styles.list}>{fresh.map((n) => renderItem(n, true))}</ul>
            </section>
          )}
          {old.length > 0 && (
            <section aria-labelledby="noti-read">
              <h2 id="noti-read" className="t-label-13 text-tertiary">
                읽은 알림
              </h2>
              <ul className={styles.list}>{old.map((n) => renderItem(n, false))}</ul>
            </section>
          )}
          {inbox.hasNextPage && (
            <Button variant="outline" fullWidth disabled={inbox.isFetchingNextPage} onClick={() => inbox.fetchNextPage()}>
              {inbox.isFetchingNextPage ? '불러오는 중' : '더 보기'}
            </Button>
          )}
          <p className={cn('t-caption-12 text-tertiary', styles.foot)}>알림은 자동으로 지워지지 않아요. 필요 없는 알림은 X 를 눌러 지워 주세요</p>
        </div>
      )}
    </Page>
  )
}
