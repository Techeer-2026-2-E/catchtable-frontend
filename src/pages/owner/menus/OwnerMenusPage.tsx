import { useRef, useState } from 'react'
import { Camera, NotebookPen, Plus } from 'lucide-react'
import { useParams } from 'react-router'
import type { Menu } from '@/entities'
import { useMenuMutations, useOwnerMenus } from '@/features/owner-store'
import { getErrorMessage, resizeImage } from '@/shared/lib'
import { formatPrice } from '@/shared/lib/format'
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  ImagePlaceholder,
  LoadingState,
  Page,
  TextField,
  Textarea,
  toast,
  Toggle,
  TopBar,
} from '@/shared/ui'
import styles from './OwnerMenusPage.module.css'

interface Draft {
  id?: number
  name: string
  price: string
  description: string
  imageUrl?: string
  soldOut: boolean
}
const EMPTY: Draft = { name: '', price: '', description: '', soldOut: false }
const toDraft = (m: Menu): Draft => ({
  id: m.id,
  name: m.name,
  price: String(m.price),
  description: m.description ?? '',
  imageUrl: m.imageUrl,
  soldOut: !!m.soldOut,
})
const MAX_PRICE = 10_000_000

/**
 * 기능명세「메뉴 설정」 (P2)
 * 조회 GET /api/user/stores/{id}/menus · 등록 POST · 수정 PATCH · 삭제 DELETE /api/owner/stores/{id}/menus
 */
export function OwnerMenusPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const id = Number(storeId)
  const { data: menus = [], isPending, isError, refetch } = useOwnerMenus(id)
  const { create, update, remove } = useMenuMutations(id)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const onError = (e: unknown) => toast(getErrorMessage(e, '저장하지 못했어요'))

  const price = Number(draft?.price || NaN)
  const priceError = draft?.price && (!Number.isInteger(price) || price < 0 || price > MAX_PRICE) ? '0원 이상 숫자로 입력해주세요' : undefined
  const canSave = !!draft && !!draft.name.trim() && draft.price !== '' && !priceError
  const saving = create.isPending || update.isPending

  const save = () => {
    if (!draft || !canSave) return
    const body = {
      name: draft.name.trim(),
      price,
      description: draft.description.trim(),
      imageUrl: draft.imageUrl ?? null,
      soldOut: draft.soldOut,
    }
    const onSuccess = (message: string) => () => {
      toast(message)
      setDraft(null)
    }
    if (draft.id) update.mutate({ menuId: draft.id, body }, { onSuccess: onSuccess('메뉴를 수정했어요'), onError })
    else create.mutate(body, { onSuccess: onSuccess('메뉴를 추가했어요'), onError })
  }

  const toggleSoldOut = (menu: Menu, onSale: boolean) =>
    update.mutate(
      { menuId: menu.id, body: { soldOut: !onSale } },
      { onSuccess: () => toast(onSale ? `${menu.name} 판매를 시작해요` : `${menu.name}을(를) 품절로 바꿨어요`), onError },
    )

  const confirmDelete = () => {
    if (!draft?.id) return
    remove.mutate(draft.id, {
      onSuccess: () => {
        toast('메뉴를 삭제했어요')
        setDeleteOpen(false)
        setDraft(null)
      },
      onError,
    })
  }

  const pickPhoto = async (file?: File) => {
    if (!file || !draft) return
    try {
      setDraft({ ...draft, imageUrl: await resizeImage(file, 480) })
    } catch (e) {
      toast(getErrorMessage(e, '사진을 불러오지 못했어요'))
    }
  }

  const onSaleCount = menus.filter((m) => !m.soldOut).length

  return (
    <Page
      bottom={
        <Button variant="soft" fullWidth leftIcon={<Plus />} onClick={() => setDraft(EMPTY)}>
          메뉴 추가
        </Button>
      }
    >
      <TopBar title="메뉴 설정" />
      {!isPending && !isError && menus.length > 0 && (
        <p className={styles.summary}>
          판매 중 <strong>{onSaleCount}개</strong> · 품절 <strong>{menus.length - onSaleCount}개</strong>
          <span className="text-tertiary"> · 예약 화면에 바로 반영돼요</span>
        </p>
      )}

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : menus.length === 0 ? (
        <EmptyState icon={<NotebookPen />} title="등록된 메뉴가 없어요" description="대표 메뉴를 등록하면 고객이 예약할 때 미리 고를 수 있어요" />
      ) : (
        <ul className={styles.list}>
          {menus.map((menu) => (
            <Card as="li" key={menu.id} className={`${styles.item} ${menu.soldOut ? styles.soldOut : ''}`}>
              <button type="button" className={styles.body} onClick={() => setDraft(toDraft(menu))}>
                <ImagePlaceholder src={menu.imageUrl} className={styles.thumb} radius={8} />
                <span className={styles.text}>
                  <span className="t-body-15">{menu.name}</span>
                  <span className="t-label-13">{formatPrice(menu.price)}</span>
                  {menu.description && <span className="t-caption-12 text-tertiary">{menu.description}</span>}
                </span>
              </button>
              {menu.soldOut && <Badge>품절</Badge>}
              <Toggle checked={!menu.soldOut} label={`${menu.name} 판매`} onChange={(on) => toggleSoldOut(menu, on)} />
            </Card>
          ))}
        </ul>
      )}

      <BottomSheet
        isOpen={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? '메뉴 수정' : '메뉴 추가'}
        footer={
          <div className={styles.footer}>
            {draft?.id && (
              <Button variant="ghost" onClick={() => setDeleteOpen(true)}>
                삭제
              </Button>
            )}
            <Button className={styles.save} onClick={save} disabled={!canSave || saving}>
              {saving ? '저장 중…' : '저장'}
            </Button>
          </div>
        }
      >
        {draft && (
          <div className={styles.form}>
            <button type="button" className={styles.photo} onClick={() => fileRef.current?.click()}>
              <ImagePlaceholder src={draft.imageUrl} className={styles.photoImage} radius={12} />
              <span className={styles.photoBadge}>
                <Camera aria-hidden />
                {draft.imageUrl ? '사진 변경' : '사진 추가'}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                pickPhoto(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <TextField
              label="메뉴 이름"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="예) 오마카세 A코스"
              maxLength={100}
            />
            <TextField
              label="1인 가격 (원)"
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
              maxLength={200}
              rows={3}
            />
            <div className={styles.row}>
              <div>
                <p className="t-body-15">판매 중</p>
                <p className="t-caption-12 text-tertiary">끄면 고객 예약 화면에 품절로 보여요</p>
              </div>
              <Toggle
                checked={!draft.soldOut}
                label="판매 중"
                onChange={(on) => setDraft({ ...draft, soldOut: !on })}
              />
            </div>
          </div>
        )}
      </BottomSheet>

      <Dialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="메뉴를 삭제할까요?"
        confirmLabel={remove.isPending ? '삭제 중…' : '삭제'}
        cancelLabel="취소"
        onConfirm={confirmDelete}
      >
        {draft?.name} 메뉴가 삭제돼요. 잠시 판매를 멈추려면 삭제 대신 품절로 바꿔주세요.
      </Dialog>
    </Page>
  )
}
