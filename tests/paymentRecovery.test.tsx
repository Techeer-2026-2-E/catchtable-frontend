import { afterEach, expect, test } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { AxiosError } from 'axios'
import { PaymentSuccessPage } from '@/pages/payment-result'
import { findPaymentByHold } from '@/features/payment'
import { mockApi, payment, reject, renderPaymentPage } from './paymentFixtures'

let restore = () => {}
afterEach(() => restore())

const entry = '/payments/success?holdId=21&paymentKey=synthetic-key&orderId=test-order-21&amount=10001'

test.each([500, 502, 503])('HTTP%s after confirm keeps an unknown result and never claims release', async (status) => {
  restore = mockApi((config) => reject(config, status, 'INTERNAL_SERVER_ERROR'))
  renderPaymentPage(<PaymentSuccessPage />, '/payments/success', entry)
  await screen.findByText('결제 결과를 확인하고 있어요')
  expect(screen.queryByText('결제하지 못했어요')).toBeNull()
  expect(screen.queryByText(/자리가 반환/)).toBeNull()
})

test('a lost confirm response remains unknown', async () => {
  restore = mockApi(() => { throw new AxiosError('connection lost', 'ERR_NETWORK') })
  renderPaymentPage(<PaymentSuccessPage />, '/payments/success', entry)
  await screen.findByText('결제 결과를 확인하고 있어요')
})

test('a verified FAILED response offers rebooking without a client release request', async () => {
  const requests: string[] = []
  restore = mockApi((config) => { requests.push(config.method ?? ''); return { ...payment, status: 'FAILED' } })
  renderPaymentPage(<PaymentSuccessPage />, '/payments/success', entry)
  await screen.findByText(/결제가 승인되지 않아 자리가 반환/)
  fireEvent.click(screen.getByRole('button', { name: '결제 화면으로' }))
  await waitFor(() => expect(screen.getByTestId('destination').textContent).toBe('/reservations/holds/21/payment'))
  expect(requests).not.toContain('delete')
})

test('only verified DONE without refundRequired navigates to the original reservation', async () => {
  restore = mockApi(() => ({ ...payment, status: 'DONE', reservationId: 21 }))
  renderPaymentPage(<PaymentSuccessPage />, '/payments/success', entry)
  await waitFor(() => expect(screen.getByTestId('destination').textContent).toBe('/reservations/21'))
})

test('a late unprotected approval is shown as payment detail instead of a confirmed reservation', async () => {
  restore = mockApi(() => ({ ...payment, status: 'DONE', reservationId: 21, refundRequired: true }))
  renderPaymentPage(<PaymentSuccessPage />, '/payments/success', entry)
  await waitFor(() => expect(screen.getByTestId('destination').textContent).toBe('/payments/31'))
})

test('recovery finds an older hold beyond the first payment page', async () => {
  restore = mockApi((config) => ({
    payments: Number(config.params?.page ?? 0) === 0 ? [{ ...payment, holdId: 999 }] : [payment],
    page: Number(config.params?.page ?? 0), size: 50, hasNext: Number(config.params?.page ?? 0) === 0,
  }))
  expect(await findPaymentByHold(21)).toEqual(payment)
})

test('recovery stops at the last page if no matching hold exists', async () => {
  restore = mockApi((config) => ({ payments: [payment], page: Number(config.params?.page ?? 0), size: 50, hasNext: false }))
  expect(await findPaymentByHold(999)).toBeNull()
})
