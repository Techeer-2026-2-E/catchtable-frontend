import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { PaymentCheckoutPage } from '@/pages/payment-checkout'
import { hold, mockApi, prepared, reject, renderPaymentPage, store } from './paymentFixtures'

const sdk = vi.hoisted(() => ({ load: vi.fn(), request: vi.fn() }))
vi.mock('@tosspayments/tosspayments-sdk', () => ({ ANONYMOUS: 'ANONYMOUS', loadTossPayments: sdk.load }))

let restore = () => {}
beforeEach(() => {
  sdk.request.mockReset().mockResolvedValue(undefined)
  sdk.load.mockReset().mockResolvedValue({ payment: () => ({ requestPayment: sdk.request }) })
})
afterEach(() => { restore(); vi.useRealTimers() })

function renderCheckout() {
  return renderPaymentPage(<PaymentCheckoutPage />, '/reservations/holds/:holdId/payment', '/reservations/holds/21/payment')
}

test('cached READY is revalidated and approval protection prevents another payment window', async () => {
  let protectedNow = false
  restore = mockApi((config) => {
    if (config.url?.endsWith('/prepare')) {
      if (protectedNow) return reject(config, 409, 'PAYMENT_STATUS_CHECK_REQUIRED')
      return prepared
    }
    return config.url?.includes('/holds/') ? hold : store
  })
  renderCheckout()
  const pay = await screen.findByRole('button', { name: '10,001원 결제하기' })
  protectedNow = true
  fireEvent.click(pay)
  await screen.findByRole('button', { name: '결제 결과 확인' })
  expect(sdk.request).not.toHaveBeenCalled()
  expect(screen.queryByText('다시 예약하기')).toBeNull()
})

test('zero seconds with PENDING_PAYMENT blocks new payment and does not claim expiry or release', async () => {
  const methods: string[] = []
  restore = mockApi((config) => {
    methods.push(config.method ?? '')
    if (config.url?.includes('/holds/')) return { ...hold, serverTime: hold.expiresAt, remainingSeconds: 0 }
    return store
  })
  const view = renderCheckout()
  await screen.findByRole('button', { name: '결제 결과 확인' })
  expect(screen.queryByRole('button', { name: /결제하기/ })).toBeNull()
  expect(screen.queryByText('결제 시간이 지났어요')).toBeNull()
  view.unmount()
  expect(methods).not.toContain('delete')
  expect(sdk.load).not.toHaveBeenCalled()
})

test('EXPIRED offers a new booking route without preparing the old hold', async () => {
  let prepares = 0
  restore = mockApi((config) => {
    if (config.url?.endsWith('/prepare')) { prepares++; return prepared }
    return config.url?.includes('/holds/') ? { ...hold, status: 'EXPIRED', remainingSeconds: 0 } : store
  })
  renderCheckout()
  fireEvent.click(await screen.findByRole('button', { name: '다시 예약하기' }))
  await waitFor(() => expect(screen.getByTestId('destination').textContent).toBe('/stores/3/reservation'))
  expect(prepares).toBe(0)
})

test('the countdown uses serverTime even when the device clock differs by years', async () => {
  restore = mockApi((config) => config.url?.endsWith('/prepare') ? prepared : config.url?.includes('/holds/') ? hold : store)
  renderCheckout()
  await screen.findByRole('button', { name: '10,001원 결제하기' })
  expect(screen.getByRole('timer').textContent).toMatch(/0[45]:[0-5][0-9]/)
})

test('explicit cancellation releases once and returns to the store', async () => {
  let deletes = 0
  restore = mockApi((config) => {
    if (config.method === 'delete') { deletes++; return undefined }
    return config.url?.endsWith('/prepare') ? prepared : config.url?.includes('/holds/') ? hold : store
  })
  renderCheckout()
  fireEvent.click(await screen.findByRole('button', { name: '선점 취소' }))
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '선점 취소' }))
  await waitFor(() => expect(screen.getByTestId('destination').textContent).toBe('/stores/3'))
  expect(deletes).toBe(1)
})

test('a protected cancellation rejection refreshes status instead of offering another payment', async () => {
  let protectedNow = false
  restore = mockApi((config) => {
    if (config.method === 'delete') { protectedNow = true; return reject(config, 409, 'RESERVATION_NOT_CANCELLABLE') }
    if (config.url?.endsWith('/prepare')) {
      if (protectedNow) return reject(config, 409, 'PAYMENT_STATUS_CHECK_REQUIRED')
      return prepared
    }
    return config.url?.includes('/holds/') ? hold : store
  })
  renderCheckout()
  fireEvent.click(await screen.findByRole('button', { name: '선점 취소' }))
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: '선점 취소' }))
  await screen.findByRole('button', { name: '결제 결과 확인' })
  expect(screen.queryByRole('button', { name: '10,001원 결제하기' })).toBeNull()
})

test('zero second status polling reaches EXPIRED and offers a fresh booking', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  let expired = false
  restore = mockApi((config) => config.url?.includes('/holds/')
    ? { ...hold, status: expired ? 'EXPIRED' : 'PENDING_PAYMENT', serverTime: hold.expiresAt, remainingSeconds: 0 }
    : store)
  renderCheckout()
  await screen.findByRole('button', { name: '결제 결과 확인' })
  expired = true
  await act(async () => { vi.advanceTimersByTime(3000) })
  await screen.findByText('결제 시간이 지났어요')
  expect(screen.getByRole('button', { name: '다시 예약하기' })).toBeTruthy()
})
