import { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { ReactElement } from 'react'
import type { Payment, PreparedPayment, ReservationHold, StoreDetail } from '@/entities'
import { apiClient } from '@/shared/lib'
import { PaymentDestination } from './PaymentDestination'

export const hold: ReservationHold = {
  holdId: 21, reservationId: 21, storeId: 3, tableId: 7,
  reservationStartAt: '2030-01-21T18:00:00+09:00', reservationEndAt: '2030-01-21T20:00:00+09:00',
  partySize: 2, status: 'PENDING_PAYMENT', expiresAt: '2030-01-20T12:05:00+09:00',
  serverTime: '2030-01-20T12:00:00+09:00', remainingSeconds: 300,
}

export const prepared: PreparedPayment = {
  paymentId: 31, reservationId: 21, holdId: 21, orderId: 'test-order-21', orderName: '예약금',
  amount: 10001, status: 'READY', expiresAt: hold.expiresAt, serverTime: hold.serverTime, remainingSeconds: 300,
}

export const payment: Payment = {
  paymentId: 31, reservationId: null, holdId: 21, orderId: prepared.orderId, orderName: prepared.orderName,
  amount: prepared.amount, status: 'READY', method: null, approvedAt: null, canceledAmount: 0,
  receiptUrl: null, refundRequired: false,
}

export const store: StoreDetail = {
  id: 3, name: '검증 식당', category: 'KOREAN', categoryName: '한식', address: '검증 주소',
  waitingAvailable: false, reservationEnabled: true, description: null, phone: null, imageUrl: null,
  businessHours: [], menus: [],
}

export function response(config: InternalAxiosRequestConfig, data: unknown, status = 200) {
  return { config, data, status, statusText: String(status), headers: {} }
}

export function reject(config: InternalAxiosRequestConfig, status: number, code: string) {
  throw new AxiosError('검증용 응답', undefined, config, undefined, response(config, { code, message: code }, status))
}

export function mockApi(handler: (config: InternalAxiosRequestConfig) => unknown | Promise<unknown>) {
  const previous = apiClient.defaults.adapter
  apiClient.defaults.adapter = async (config) => response(config, await handler(config))
  return () => { apiClient.defaults.adapter = previous }
}

export function renderPaymentPage(element: ReactElement, route: string, entry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path={route} element={element} />
          <Route path="*" element={<PaymentDestination />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { ...rendered, queryClient }
}
