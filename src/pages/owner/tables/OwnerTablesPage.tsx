import { useParams } from 'react-router'

export function OwnerTablesPage() {
  const { storeId } = useParams<{ storeId: string }>()

  return (
    <main>
      <h1>좌석 설정 #{storeId}</h1>
      {/* TODO: 테이블별 수용 인원 설정 (useStoreTables, useStoreTableMutations) */}
    </main>
  )
}
