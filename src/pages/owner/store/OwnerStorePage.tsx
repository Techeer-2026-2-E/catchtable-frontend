import { CalendarCheck, ChartColumn, Clock, ListChecks, NotebookPen, Settings2, Star, Users } from 'lucide-react'
import { useParams } from 'react-router'
import { findMockStore, MOCK_BUSINESS_HOURS, MOCK_OWNER_RESERVATIONS, MOCK_OWNER_WAITINGS, MOCK_TABLES } from '@/entities/mock'
import { paths } from '@/shared/config'
import { dayjs } from '@/shared/lib/dayjs'
import { Divider, KPICard, ListItem, Page, toast, TopBar } from '@/shared/ui'
import styles from './OwnerStorePage.module.css'

/** 점주 — 매장 관리 홈 */
export function OwnerStorePage() {
  const { storeId = '' } = useParams<{ storeId: string }>()
  // TODO(API 연동): 매장 상세 · 오늘 예약/웨이팅 요약 조회
  const store = findMockStore(storeId)
  const todayReservations = MOCK_OWNER_RESERVATIONS.filter((r) => r.status === 'CONFIRMED' || r.status === 'VISITED')
  const waitings = MOCK_OWNER_WAITINGS.filter((w) => w.status === 'WAITING' || w.status === 'CALLED')
  const activeTables = MOCK_TABLES.filter((t) => t.status === 'ACTIVE')
  const today = MOCK_BUSINESS_HOURS.find((h) => h.dayOfWeek === dayjs().day())
  const preparing = () => toast('준비 중인 기능이에요')

  return (
    <Page>
      <TopBar title={store.name} />
      <div className={styles.kpis}>
        <KPICard label="오늘 예약" value={`${todayReservations.length}건`} />
        <KPICard label="웨이팅" value={`${waitings.length}팀`} />
        <KPICard label="운영 테이블" value={`${activeTables.length}개`} />
      </div>

      <p className={styles.group}>운영</p>
      <ListItem
        icon={<CalendarCheck />}
        title="예약 현황 관리"
        value={`오늘 ${todayReservations.length}건`}
        to={paths.ownerReservations(storeId)}
      />
      <ListItem icon={<ListChecks />} title="웨이팅 현황 관리" value={`${waitings.length}팀 대기`} to={paths.ownerWaitings(storeId)} />

      <Divider thick />
      <p className={styles.group}>매장 설정</p>
      <ListItem icon={<Users />} title="테이블별 수용 인원 설정" value={`${MOCK_TABLES.length}개 테이블`} to={paths.ownerTables(storeId)} />
      <ListItem
        icon={<Clock />}
        title="영업시간 관리"
        value={today && !today.closed ? `${today.openTime}~${today.closeTime}` : '오늘 휴무'}
        to={paths.ownerHours(storeId)}
      />
      <ListItem icon={<Settings2 />} title="예약 정책 관리" to={paths.ownerPolicy(storeId)} />

      <Divider thick />
      {/* P2: 메뉴 설정 · 매출 관리 · 점주 리뷰 관리 */}
      <p className={styles.group}>더보기</p>
      <ListItem icon={<NotebookPen />} title="메뉴 설정" onClick={preparing} />
      <ListItem icon={<ChartColumn />} title="매출 관리" onClick={preparing} />
      <ListItem icon={<Star />} title="리뷰 관리" value={`${store.reviewCount ?? 0}개`} onClick={preparing} />
    </Page>
  )
}
