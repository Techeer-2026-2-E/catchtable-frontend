import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { StoreTable } from '@/entities'
import { useStoreTableMutations, useStoreTables } from '@/features/owner-store'
import { useParams } from 'react-router'
import { getErrorMessage } from '@/shared/lib'
import { Badge, BottomSheet, Button, Card, ErrorState, LoadingState, Page, Stepper, toast, Toggle, TopBar } from '@/shared/ui'
import styles from './OwnerTablesPage.module.css'

/** 새 테이블 — StoreTableCreateRequest (등록 후에는 운영 상태만 바꿀 수 있음) */
type Draft = Pick<StoreTable, 'tableNumber' | 'minCapacity' | 'capacity'>
const EMPTY_DRAFT: Draft = { tableNumber: 0, capacity: 4, minCapacity: 2 }

const capacityLabel = (t: Pick<StoreTable, 'minCapacity' | 'capacity'>) =>
  (t.minCapacity ?? 1) === t.capacity ? `${t.capacity}명` : `${t.minCapacity ?? 1}~${t.capacity}명`

/** 기능명세「테이블별 수용 인원 설정」 — 등록 POST, 운영 상태 변경 PATCH { status } */
export function OwnerTablesPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const id = Number(storeId)
  const { data: tables = [], isPending, isError, refetch } = useStoreTables(id)
  const { create, update } = useStoreTableMutations(id)
  const [draft, setDraft] = useState<Draft | null>(null)
  const onError = (e: unknown) => toast(getErrorMessage(e, '저장하지 못했어요'))

  const active = tables.filter((t) => t.status === 'ACTIVE')
  const totalCapacity = active.reduce((sum, t) => sum + t.capacity, 0)

  const openNew = () => setDraft({ ...EMPTY_DRAFT, tableNumber: Math.max(0, ...tables.map((t) => t.tableNumber)) + 1 })

  const save = () => {
    if (!draft) return
    create.mutate(draft, {
      onSuccess: () => {
        toast('테이블을 추가했어요')
        setDraft(null)
      },
      onError,
    })
  }

  const toggleActive = (table: StoreTable, on: boolean) =>
    update.mutate(
      { tableId: table.id, body: { status: on ? 'ACTIVE' : 'INACTIVE' } },
      { onSuccess: () => toast(on ? `${table.tableNumber}번 테이블을 운영해요` : `${table.tableNumber}번 테이블을 쉬어요`), onError },
    )

  const duplicated = !!draft && tables.some((t) => t.tableNumber === draft.tableNumber)

  return (
    <Page
      bottom={
        <Button variant="soft" fullWidth leftIcon={<Plus />} onClick={openNew}>
          테이블 추가
        </Button>
      }
    >
      <TopBar title="테이블별 수용 인원 설정" />
      <p className={styles.summary}>
        운영 중 <strong>{active.length}개</strong> 테이블 · 최대 <strong>{totalCapacity}명</strong> 동시 수용
      </p>

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <ul className={styles.list}>
          {tables.map((table) => {
            const inactive = table.status === 'INACTIVE'
            return (
              <Card as="li" key={table.id} className={`${styles.item} ${inactive ? styles.inactive : ''}`}>
                <div className={styles.text}>
                  <span className="t-body-15">{table.tableNumber}번 테이블</span>
                  <span className="t-caption-13 text-tertiary">수용 {capacityLabel(table)}</span>
                </div>
                {inactive && <Badge>미운영</Badge>}
                <Toggle checked={!inactive} label={`${table.tableNumber}번 테이블 운영`} onChange={(on) => toggleActive(table, on)} />
              </Card>
            )
          })}
        </ul>
      )}

      <BottomSheet
        isOpen={!!draft}
        onClose={() => setDraft(null)}
        title="테이블 추가"
        footer={
          <Button onClick={save} disabled={duplicated || create.isPending}>
            저장
          </Button>
        }
      >
        {draft && (
          <div className={styles.form}>
            <div className={styles.row}>
              <span className="t-body-15">테이블 번호</span>
              <Stepper
                value={draft.tableNumber}
                onChange={(tableNumber) => setDraft({ ...draft, tableNumber })}
                min={1}
                unit="번"
                label="테이블 번호"
              />
            </div>
            {duplicated && <p className="t-caption-12 text-danger">이미 있는 테이블 번호예요</p>}
            <div className={styles.row}>
              <span className="t-body-15">최소 인원</span>
              <Stepper
                value={draft.minCapacity ?? 1}
                onChange={(minCapacity) => setDraft({ ...draft, minCapacity })}
                min={1}
                max={draft.capacity}
                unit="명"
                label="최소 인원"
              />
            </div>
            <div className={styles.row}>
              <span className="t-body-15">최대 인원</span>
              <Stepper
                value={draft.capacity}
                onChange={(capacity) => setDraft({ ...draft, capacity })}
                min={draft.minCapacity ?? 1}
                max={20}
                unit="명"
                label="최대 인원"
              />
            </div>
          </div>
        )}
      </BottomSheet>
    </Page>
  )
}
