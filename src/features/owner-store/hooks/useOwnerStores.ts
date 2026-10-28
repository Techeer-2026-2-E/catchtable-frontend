import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReservationPolicy, SalesPeriod, StoreReview } from '@/entities'
import {
  ownerStoreApi,
  type BusinessHourRequest,
  type CreateMenuRequest,
  type UpdateMenuRequest,
  type UpdateStoreRequest,
} from '../api/ownerStoreApi'
import { isFeatureAvailable } from '@/shared/config'
import { ownerStoreKeys } from '../api/queryKeys'

export function useMyStores() {
  return useQuery({ queryKey: ownerStoreKeys.list(), queryFn: ownerStoreApi.getMyStores })
}

export function useCreateStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ownerStoreApi.createStore,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ownerStoreKeys.list() }),
  })
}

export function useUpdateStore(storeId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateStoreRequest) => ownerStoreApi.updateStore(storeId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ownerStoreKeys.list() }),
  })
}

/* ---------- 영업시간 ---------- */
export function useBusinessHours(storeId: number) {
  return useQuery({
    queryKey: ownerStoreKeys.businessHours(storeId),
    queryFn: () => ownerStoreApi.getBusinessHours(storeId),
  })
}

export function useReplaceBusinessHours(storeId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (hours: BusinessHourRequest[]) => ownerStoreApi.replaceBusinessHours(storeId, hours),
    onSuccess: (data) => queryClient.setQueryData(ownerStoreKeys.businessHours(storeId), data),
  })
}

/* ---------- 예약 정책 ---------- */
export function useReservationPolicy(storeId: number) {
  return useQuery({
    queryKey: ownerStoreKeys.policy(storeId),
    queryFn: () => ownerStoreApi.getReservationPolicy(storeId),
  })
}

export function useReplaceReservationPolicy(storeId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ReservationPolicy) => ownerStoreApi.replaceReservationPolicy(storeId, body),
    onSuccess: (data) => queryClient.setQueryData(ownerStoreKeys.policy(storeId), data),
  })
}

/* ---------- P2: 메뉴 ---------- */
export function useOwnerMenus(storeId: number) {
  return useQuery({ queryKey: ownerStoreKeys.menus(storeId), queryFn: () => ownerStoreApi.getMenus(storeId) })
}

export function useMenuMutations(storeId: number) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ownerStoreKeys.menus(storeId) })
  return {
    create: useMutation({
      mutationFn: (body: CreateMenuRequest) => ownerStoreApi.createMenu(storeId, body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ menuId, body }: { menuId: number; body: UpdateMenuRequest }) =>
        ownerStoreApi.updateMenu(storeId, menuId, body),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (menuId: number) => ownerStoreApi.deleteMenu(storeId, menuId),
      onSuccess: invalidate,
    }),
  }
}

/* ---------- P2: 매출 ---------- */
export function useSales(storeId: number, period: SalesPeriod) {
  return useQuery({
    queryKey: ownerStoreKeys.sales(storeId, period),
    queryFn: () => ownerStoreApi.getSales(storeId, { period }),
    enabled: isFeatureAvailable('sales'),
  })
}

/* ---------- P2: 리뷰 관리 ---------- */
export function useOwnerReviews(storeId: number) {
  return useQuery({ queryKey: ownerStoreKeys.reviews(storeId), queryFn: () => ownerStoreApi.getReviews(storeId) })
}

/** 답글 저장·삭제 — 응답으로 받은 리뷰로 목록 캐시를 바로 갱신 */
export function useReviewReply(storeId: number) {
  const queryClient = useQueryClient()
  const replace = (review: StoreReview) =>
    queryClient.setQueryData<StoreReview[]>(ownerStoreKeys.reviews(storeId), (list) =>
      list?.map((r) => (r.reviewId === review.reviewId ? review : r)),
    )
  return {
    save: useMutation({
      mutationFn: ({ reviewId, content }: { reviewId: number; content: string }) =>
        ownerStoreApi.replyReview(reviewId, content),
      onSuccess: replace,
    }),
    remove: useMutation({ mutationFn: ownerStoreApi.deleteReply, onSuccess: replace }),
  }
}
