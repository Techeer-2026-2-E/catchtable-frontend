import { CalendarCheck, ChartColumn, Clock, ListChecks, NotebookPen, Settings2, Star, Users } from 'lucide-react'
import { useParams } from 'react-router'
import { toDayOfWeek } from '@/entities'
import { useOwnerReservations } from '@/features/owner-reservation'
import { useBusinessHours, useMyStores, useOwnerMenus, useOwnerReviews, useStoreTables } from '@/features/owner-store'
import { useOwnerWaitings } from '@/features/owner-waiting'
import { paths } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { Divider, KPICard, ListItem, Page, TopBar } from '@/shared/ui'
import styles from './OwnerStorePage.module.css'

/** 점주 — 매장 관리 홈 */
export function OwnerStorePage() {
  const { storeId = '' } = useParams<{ storeId: string }>()
  const id = Number(storeId)
  const store = useMyStores().data?.find((s) => s.id === id)
  const reservations = useOwnerReservations(id, dayjs().format('YYYY-MM-DD'))
  const waitings = useOwnerWaitings(id)
  const tables = useStoreTables(id)
  const hours = useBusinessHours(id)
  const menus = useOwnerMenus(id)
  const reviews = useOwnerReviews(id)
  const unanswered = reviews.data?.filter((r) => !r.reply).length ?? 0

  const todayReservations = reservations.data?.filter((r) => r.status === 'CONFIRMED') ?? []
  const activeTables = tables.data?.filter((t) => t.status === 'ACTIVE') ?? []
  const today = hours.data?.find((h) => h.dayOfWeek === toDayOfWeek(dayjs().day()))
  const count = (loading: boolean, n: number, unit: string) => (loading ? '-' : `${n}${unit}`)

  return (
    <Page>
      <TopBar title={store?.name ?? '매장 관리'} />
      <div className={styles.kpis}>
        <KPICard label="오늘 예약" value={count(reservations.isPending, todayReservations.length, '건')} />
        <KPICard label="웨이팅" value={count(waitings.isPending, waitings.data?.length ?? 0, '팀')} />
        <KPICard label="운영 테이블" value={count(tables.isPending, activeTables.length, '개')} />
      </div>

      <p className={styles.group}>운영</p>
      <ListItem
        icon={<CalendarCheck />}
        title="예약 현황 관리"
        value={`오늘 ${todayReservations.length}건`}
        to={paths.ownerReservations(storeId)}
      />
      <ListItem icon={<ListChecks />} title="웨이팅 현황 관리" value={`${waitings.data?.length ?? 0}팀 대기`} to={paths.ownerWaitings(storeId)} />

      <Divider thick />
      <p className={styles.group}>매장 설정</p>
      <ListItem icon={<Users />} title="테이블별 수용 인원 설정" value={`${tables.data?.length ?? 0}개 테이블`} to={paths.ownerTables(storeId)} />
      <ListItem
        icon={<Clock />}
        title="영업시간 관리"
        value={today ? `${today.openTime.slice(0, 5)}~${today.closingTime.slice(0, 5)}` : '오늘 휴무'}
        to={paths.ownerHours(storeId)}
      />
      <ListItem icon={<Settings2 />} title="예약 정책 관리" to={paths.ownerPolicy(storeId)} />

      <Divider thick />
      <p className={styles.group}>더보기</p>
      <ListItem
        icon={<NotebookPen />}
        title="메뉴 설정"
        value={menus.data ? `${menus.data.length}개` : undefined}
        to={paths.ownerMenus(storeId)}
      />
      <ListItem icon={<ChartColumn />} title="매출 관리" to={paths.ownerSales(storeId)} />
      <ListItem
        icon={<Star />}
        title="리뷰 관리"
        value={unanswered ? `미답변 ${unanswered}개` : `${reviews.data?.length ?? 0}개`}
        to={paths.ownerReviews(storeId)}
      />
    </Page>
  )
}
