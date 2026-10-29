import { useState } from 'react'
import { NotebookPen, Plus } from 'lucide-react'
import { useParams } from 'react-router'
import type { Menu } from '@/entities'
import { useMenuMutations, useOwnerMenus } from '@/features/owner-store'
import { getErrorMessage } from '@/shared/lib'
import { formatPrice } from '@/shared/lib/format'
import { BottomSheet, Button, Card, EmptyState, ErrorState, LoadingState, Page, TextField, Textarea, toast, TopBar } from '@/shared/ui'
import styles from './OwnerMenusPage.module.css'

interface Draft {
  id?: number
  name: string
  price: string
  description: string
}
const EMPTY: Draft = { name: '', price: '', description: '' }
const toDraft = (m: Menu): Draft => ({ id: m.id, name: m.name, price: String(m.price), description: m.description ?? '' })
const NAME_MAX = 100
const DESCRIPTION_MAX = 1000
const MAX_PRICE = 10_000_000

/**
 * 기능명세「메뉴 설정」
 * 조회 GET /api/user/stores/{id} (menus) · 등록 POST · 수정 PATCH /api/owner/stores/{id}/menus
 */
export function OwnerMenusPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const id = Number(storeId)
  const { data: menus = [], isPending, isError, refetch } = useOwnerMenus(id)
  const { create, update } = useMenuMutations(id)
  const [draft, setDraft] = useState<Draft | null>(null)
  const onError = (e: unknown) => toast(getErrorMessage(e, '저장하지 못했어요'))

  const price = Number(draft?.price || NaN)
  const priceError =
    draft?.price && (!Number.isInteger(price) || price < 0 || price > MAX_PRICE) ? '0원 이상 숫자로 입력해주세요' : undefined
  const canSave = !!draft && !!draft.name.trim() && draft.price !== '' && !priceError
  const saving = create.isPending || update.isPending

  const save = () => {
    if (!draft || !canSave) return
    const body = { name: draft.name.trim(), price, description: draft.description.trim() }
    const onSuccess = (message: string) => () => {
      toast(message)
      setDraft(null)
    }
    if (draft.id) update.mutate({ menuId: draft.id, body }, { onSuccess: onSuccess('메뉴를 수정했어요'), onError })
    else create.mutate(body, { onSuccess: onSuccess('메뉴를 추가했어요'), onError })
  }

  return (
    <Page
      bottom={
        <Button variant="soft" fullWidth leftIcon={<Plus />} onClick={() => setDraft(EMPTY)}>
          메뉴 추가
        </Button>
      }
    >
      <TopBar title="메뉴 설정" />

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : menus.length === 0 ? (
        <EmptyState icon={<NotebookPen />} title="등록된 메뉴가 없어요" description="메뉴를 등록하면 매장 상세에 보여요" />
      ) : (
        <ul className={styles.list}>
          {menus.map((menu) => (
            <Card as="li" key={menu.id} className={styles.item}>
              <button type="button" className={styles.body} onClick={() => setDraft(toDraft(menu))}>
                <span className={styles.text}>
                  <span className="t-body-15">{menu.name}</span>
                  <span className="t-label-13">{formatPrice(menu.price)}</span>
                  {menu.description && <span className="t-caption-12 text-tertiary">{menu.description}</span>}
                </span>
              </button>
            </Card>
          ))}
        </ul>
      )}

      <BottomSheet
        isOpen={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? '메뉴 수정' : '메뉴 추가'}
        footer={
          <Button onClick={save} disabled={!canSave || saving}>
            {saving ? '저장 중…' : '저장'}
          </Button>
        }
      >
        {draft && (
          <div className={styles.form}>
            <TextField
              label="메뉴 이름"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="예) 오마카세 A코스"
              maxLength={NAME_MAX}
            />
            <TextField
              label="가격 (원)"
              inputMode="numeric"
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: e.target.value.replace(/[^\d]/g, '') })}
              placeholder="예) 45000"
              error={priceError}
              helperText={draft.price && !priceError ? formatPrice(price) : undefined}
            />
            <Textarea
              label="설명 (선택)"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="구성이나 특징을 짧게 적어주세요"
              maxLength={DESCRIPTION_MAX}
              rows={3}
            />
          </div>
        )}
      </BottomSheet>
    </Page>
  )
}
