import { useState, type ReactNode } from 'react'
import { Armchair, DoorClosed, Plus, Wine } from 'lucide-react'
import { TABLE_TYPE_LABEL, type StoreTable, type TableType } from '@/entities'
import { MOCK_TABLES } from '@/entities/mock'
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  Chip,
  ChipGroup,
  Page,
  Stepper,
  toast,
  Toggle,
  TopBar,
} from '@/shared/ui'
import styles from './OwnerTablesPage.module.css'

const TYPE_ICON: Record<TableType, ReactNode> = {
  ROOM: <DoorClosed aria-hidden />,
  HALL: <Armchair aria-hidden />,
  BAR: <Wine aria-hidden />,
}
type Draft = Omit<StoreTable, 'id'> & { id?: number }
const EMPTY_DRAFT: Draft = { tableNumber: 0, capacity: 4, minCapacity: 2, status: 'ACTIVE', tableType: 'HALL' }

const capacityLabel = (t: Pick<StoreTable, 'minCapacity' | 'capacity'>) =>
  (t.minCapacity ?? 1) === t.capacity ? `${t.capacity}명` : `${t.minCapacity ?? 1}~${t.capacity}명`

/** 기능명세「테이블별 수용 인원 설정」 */
export function OwnerTablesPage() {
  // TODO(API 연동): useStoreTables(storeId), useStoreTableMutations(storeId)
  const [tables, setTables] = useState(MOCK_TABLES)
  const [draft, setDraft] = useState<Draft | null>(null)

  const active = tables.filter((t) => t.status === 'ACTIVE')
  const totalCapacity = active.reduce((sum, t) => sum + t.capacity, 0)

  const openNew = () =>
    setDraft({ ...EMPTY_DRAFT, tableNumber: Math.max(0, ...tables.map((t) => t.tableNumber)) + 1 })

  const save = () => {
    if (!draft) return
    if (draft.id) {
      setTables((list) => list.map((t) => (t.id === draft.id ? { ...t, ...draft, id: t.id } : t)))
      toast('테이블을 수정했어요')
    } else {
      setTables((list) => [...list, { ...draft, id: Date.now() }])
      toast('테이블을 추가했어요')
    }
    setDraft(null)
  }

  const duplicated = !!draft && tables.some((t) => t.tableNumber === draft.tableNumber && t.id !== draft.id)

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

      <ul className={styles.list}>
        {tables.map((table) => {
          const type = table.tableType ?? 'HALL'
          const inactive = table.status === 'INACTIVE'
          return (
            <Card as="li" key={table.id} className={`${styles.item} ${inactive ? styles.inactive : ''}`}>
              <span className={styles.icon}>{TYPE_ICON[type]}</span>
              <button type="button" className={styles.text} onClick={() => setDraft(table)}>
                <span className="t-body-15">
                  {table.tableNumber}번 테이블 <span className="text-tertiary">({TABLE_TYPE_LABEL[type]})</span>
                </span>
                <span className="t-caption-13 text-tertiary">
                  수용 {capacityLabel(table)}
                </span>
              </button>
              {inactive && <Badge>미운영</Badge>}
              <Toggle
                checked={!inactive}
                label={`${table.tableNumber}번 테이블 운영`}
                onChange={(on) =>
                  setTables((list) =>
                    list.map((t) => (t.id === table.id ? { ...t, status: on ? 'ACTIVE' : 'INACTIVE' } : t)),
                  )
                }
              />
            </Card>
          )
        })}
      </ul>

      <BottomSheet
        isOpen={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? `${draft.tableNumber}번 테이블 수정` : '테이블 추가'}
        footer={
          <Button onClick={save} disabled={duplicated}>
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
            <div className={styles.field}>
              <span className="t-body-15">공간 타입</span>
              <ChipGroup label="공간 타입">
                {(Object.keys(TABLE_TYPE_LABEL) as TableType[]).map((type) => (
                  <Chip key={type} selected={draft.tableType === type} onClick={() => setDraft({ ...draft, tableType: type })}>
                    {TABLE_TYPE_LABEL[type]}
                  </Chip>
                ))}
              </ChipGroup>
            </div>
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
