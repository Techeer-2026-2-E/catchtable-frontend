import { Info } from 'lucide-react'
import type { NotificationSettings } from '@/entities'
import { useNotificationSettings, useUpdateNotificationSettings } from '@/features/member'
import { getErrorMessage } from '@/shared/lib'
import { ErrorState, ListItem, ListSkeleton, Page, toast, Toggle, TopBar } from '@/shared/ui'
import styles from './NotificationSettingsPage.module.css'

const ITEMS: { key: keyof NotificationSettings; title: string; description: string }[] = [
  { key: 'reservationEnabled', title: '예약 알림', description: '예약 확정, 변경, 취소, 방문 전 안내' },
  { key: 'waitingEnabled', title: '웨이팅 알림', description: '내 순서가 바뀌거나 가까워졌을 때' },
]

/** 알림 설정 — GET·PUT /api/user/members/me/notification-settings, 토글하면 바로 저장 */
export function NotificationSettingsPage() {
  const { data, isPending, isError, refetch } = useNotificationSettings()
  const update = useUpdateNotificationSettings()

  const toggle = (key: keyof NotificationSettings, value: boolean) => {
    if (!data) return
    update.mutate(
      { ...data, [key]: value },
      { onError: (e) => toast(getErrorMessage(e, '알림 설정을 바꾸지 못했어요')) },
    )
  }

  return (
    <Page>
      <TopBar title="알림 설정" />
      {isPending ? (
        <ListSkeleton rows={4} trailing />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          {ITEMS.map((item) => (
            <ListItem
              key={item.key}
              title={<span className="t-headline-16">{item.title}</span>}
              description={item.description}
              trailing={<Toggle checked={data[item.key]} label={item.title} onChange={(v) => toggle(item.key, v)} />}
            />
          ))}
          <p className={`${styles.notice} t-caption-13`}>
            <Info aria-hidden />
            입장 호출이나 예약 취소처럼 꼭 알아야 하는 알림은 꺼도 보내드려요.
          </p>
        </>
      )}
    </Page>
  )
}
