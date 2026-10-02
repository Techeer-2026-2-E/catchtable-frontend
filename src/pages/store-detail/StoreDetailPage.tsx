import { useParams } from 'react-router'

export function StoreDetailPage() {
  const { storeId } = useParams<{ storeId: string }>()

  return (
    <main>
      <h1>매장 상세 #{storeId}</h1>
      {/* TODO: 매장 정보 (useStoreDetail), 메뉴 (useStoreMenus), 예약하기 / 웨이팅 신청 버튼 */}
    </main>
  )
}
