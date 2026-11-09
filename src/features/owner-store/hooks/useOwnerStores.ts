import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReservationPolicy } from '@/entities'
import {
  ownerStoreApi,
  type BusinessHourRequest,
  type CreateMenuRequest,
  type DepositPolicyRequest,
  type SpecialBusinessDayRequest,
  type StoreInfoUpdateRequest,
  type UpdateMenuRequest,
} from '../api/ownerStoreApi'
import { ownerStoreKeys } from '../api/queryKeys'

export function useMyStores() {
  return useQuery({ queryKey: ownerStoreKeys.list(), queryFn: ownerStoreApi.getMyStores })
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

/* ---------- 메뉴 ---------- */
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
      mutationFn: ({ menuId, body }: { menuId: number; body: UpdateMenuRequest }) => ownerStoreApi.updateMenu(storeId, menuId, body),
      onSuccess: invalidate,
    }),
  }
}

/* ---------- 매장 정보 ---------- */
export function useUpdateStoreInfo(storeId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: StoreInfoUpdateRequest) => ownerStoreApi.updateStoreInfo(storeId, body),
    // 점주 매장 목록과 고객 매장 상세(['store-detail', id]) 모두 새로 받음
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ownerStoreKeys.list() }),
        queryClient.invalidateQueries({ queryKey: ['store-detail', storeId] }),
      ]),
  })
}

/* ---------- 특정일 휴무, 영업 변경 ---------- */
export function useSpecialDays(storeId: number) {
  return useQuery({
    queryKey: ownerStoreKeys.specialDays(storeId),
    queryFn: () => ownerStoreApi.getSpecialDays(storeId),
  })
}

export function useSpecialDayMutations(storeId: number) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ownerStoreKeys.specialDays(storeId) })
  return {
    put: useMutation({
      mutationFn: ({ date, body }: { date: string; body: SpecialBusinessDayRequest }) => ownerStoreApi.putSpecialDay(storeId, date, body),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (date: string) => ownerStoreApi.deleteSpecialDay(storeId, date),
      onSuccess: invalidate,
    }),
  }
}

/* ---------- 예약금 정책 ---------- */
export function useDepositPolicy(storeId: number) {
  return useQuery({
    queryKey: ownerStoreKeys.deposit(storeId),
    queryFn: () => ownerStoreApi.getDepositPolicy(storeId),
  })
}

export function useReplaceDepositPolicy(storeId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: DepositPolicyRequest) => ownerStoreApi.replaceDepositPolicy(storeId, body),
    onSuccess: (data) => queryClient.setQueryData(ownerStoreKeys.deposit(storeId), data),
  })
}
