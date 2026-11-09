import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { STORE_CATEGORY_LABEL, type StoreCategory, type StoreDetail } from '@/entities'
import { useMyStores, useUpdateStoreInfo } from '@/features/owner-store'
import { getErrorMessage } from '@/shared/lib'
import { Button, Chip, ChipGroup, ErrorState, ImagePlaceholder, LoadingState, Page, TextField, Textarea, toast, TopBar } from '@/shared/ui'
import styles from './OwnerStoreInfoPage.module.css'

const CATEGORIES = Object.keys(STORE_CATEGORY_LABEL) as StoreCategory[]
const PHONE = /^0\d{1,2}-\d{3,4}-\d{4}$/
const IMAGE_URL = /^https?:\/\/.+/

/**
 * 기능명세「매장 정보 수정」
 * PATCH /api/owner/stores/{storeId} — 조회 API 가 없어서 초기값은 매장 상세(GET /api/user/stores/{id})
 */
export function OwnerStoreInfoPage() {
  const { storeId } = useParams<{ storeId: string }>()
  const id = Number(storeId)
  const { data, isPending, isError, refetch } = useMyStores()
  const store = data?.find((s) => s.id === id)

  if (isPending || isError || !store) {
    return (
      <Page>
        <TopBar title="매장 정보 수정" />
        {isPending ? <LoadingState /> : <ErrorState onRetry={() => refetch()} />}
      </Page>
    )
  }
  return <StoreInfoForm key={store.id} store={store} />
}

function StoreInfoForm({ store }: { store: StoreDetail }) {
  const navigate = useNavigate()
  const update = useUpdateStoreInfo(store.id)
  const [form, setForm] = useState({
    name: store.name,
    category: store.category,
    address: store.address,
    description: store.description ?? '',
    phone: store.phone ?? '',
    imageUrl: store.imageUrl ?? '',
  })
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  const errors = {
    name: !form.name.trim() ? '매장 이름을 입력해주세요' : undefined,
    address: !form.address.trim() ? '주소를 입력해주세요' : undefined,
    phone: form.phone && !PHONE.test(form.phone) ? '02-1234-5678 형식으로 입력해주세요' : undefined,
    imageUrl: form.imageUrl && !IMAGE_URL.test(form.imageUrl) ? 'http 또는 https 로 시작하는 주소를 넣어주세요' : undefined,
  }
  const invalid = Object.values(errors).some(Boolean)
  const previewUrl = form.imageUrl && !errors.imageUrl ? form.imageUrl : undefined

  const save = () =>
    update.mutate(
      { ...form, name: form.name.trim(), address: form.address.trim(), description: form.description.trim() },
      {
        onSuccess: () => {
          toast('매장 정보를 저장했어요')
          navigate(-1)
        },
        onError: (e) => toast(getErrorMessage(e, '저장하지 못했어요')),
      },
    )

  return (
    <Page
      bottom={
        <Button fullWidth disabled={invalid || update.isPending} onClick={save}>
          {update.isPending ? '저장 중…' : '저장'}
        </Button>
      }
    >
      <TopBar title="매장 정보 수정" />
      <div className={styles.form}>
        <div className={styles.field}>
          <span className="t-label-13 text-secondary">대표 사진</span>
          <ImagePlaceholder src={previewUrl} alt={`${form.name} 대표 사진`} className={styles.photo} />
        </div>
        <TextField
          label="사진 주소"
          inputMode="url"
          placeholder="https://"
          value={form.imageUrl}
          onChange={(e) => set({ imageUrl: e.target.value.trim() })}
          error={errors.imageUrl}
          helperText="사진 주소를 붙여 넣으면 미리보기가 바뀌어요. 사진은 한 장만 쓸 수 있어요."
        />
        <TextField label="매장 이름" value={form.name} maxLength={200} onChange={(e) => set({ name: e.target.value })} error={errors.name} />
        <div className={styles.field}>
          <span className="t-label-13 text-secondary">카테고리</span>
          <ChipGroup scroll label="카테고리">
            {CATEGORIES.map((c) => (
              <Chip key={c} size="S" selected={form.category === c} onClick={() => set({ category: c })}>
                {STORE_CATEGORY_LABEL[c]}
              </Chip>
            ))}
          </ChipGroup>
        </div>
        <TextField label="주소" value={form.address} maxLength={255} onChange={(e) => set({ address: e.target.value })} error={errors.address} />
        <TextField
          label="전화번호"
          inputMode="tel"
          placeholder="02-1234-5678"
          value={form.phone}
          onChange={(e) => set({ phone: e.target.value.replace(/[^0-9-]/g, '') })}
          error={errors.phone}
        />
        <Textarea label="소개" rows={3} maxLength={1000} value={form.description} onChange={(e) => set({ description: e.target.value })} />
      </div>
    </Page>
  )
}
