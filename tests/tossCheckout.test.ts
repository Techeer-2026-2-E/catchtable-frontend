import { beforeEach, expect, test, vi } from 'vitest'
import { prepared } from './paymentFixtures'

const sdk = vi.hoisted(() => ({ load: vi.fn(), request: vi.fn() }))
vi.mock('@tosspayments/tosspayments-sdk', () => ({ ANONYMOUS: 'ANONYMOUS', loadTossPayments: sdk.load }))

beforeEach(() => {
  vi.resetModules()
  sdk.request.mockReset().mockResolvedValue(undefined)
  sdk.load.mockReset().mockResolvedValue({ payment: () => ({ requestPayment: sdk.request }) })
})

// 키 없는 실제 API 모드에서 합성 거래 키를 만들어 보내지 않아야 한다.
test('a missing key against the real backend never fabricates a payment callback', async () => {
  vi.stubEnv('VITE_TOSS_CLIENT_KEY', '')
  const { requestTossPayment } = await import('@/features/payment/lib/tossCheckout')
  const prepare = vi.fn().mockResolvedValue(prepared)
  await expect(requestTossPayment(prepare)).rejects.toThrow('결제 설정')
  expect(prepare).not.toHaveBeenCalled()
  expect(sdk.load).not.toHaveBeenCalled()
})

test('the server is checked after SDK initialization and a zero second result cannot open a payment', async () => {
  let loaded!: (value: unknown) => void
  sdk.load.mockReturnValue(new Promise((resolve) => { loaded = resolve }))
  const { requestTossPayment } = await import('@/features/payment/lib/tossCheckout')
  let expired = false
  const prepare = vi.fn(async () => ({ ...prepared, remainingSeconds: expired ? 0 : 300 }))
  const opening = requestTossPayment(prepare)
  const rejected = expect(opening).rejects.toThrow('결제 시간')
  expired = true
  loaded({ payment: () => ({ requestPayment: sdk.request }) })
  await rejected
  expect(sdk.request).not.toHaveBeenCalled()
})

test('approval protection discovered after SDK initialization prevents a new payment window', async () => {
  const { requestTossPayment } = await import('@/features/payment/lib/tossCheckout')
  await expect(requestTossPayment(async () => { throw new Error('PAYMENT_STATUS_CHECK_REQUIRED') }))
    .rejects.toThrow('PAYMENT_STATUS_CHECK_REQUIRED')
  expect(sdk.request).not.toHaveBeenCalled()
})

test('the payment window uses the current server order and original amount without multiplying party size', async () => {
  const { requestTossPayment } = await import('@/features/payment/lib/tossCheckout')
  await requestTossPayment(async () => prepared)
  expect(sdk.request).toHaveBeenCalledWith(expect.objectContaining({
    orderId: 'test-order-21', amount: { currency: 'KRW', value: 10001 },
  }))
})

test('an explicitly selected local simulation never initializes the external SDK', async () => {
  vi.stubEnv('VITE_TOSS_SIMULATION', 'true')
  const { requestTossPayment } = await import('@/features/payment/lib/tossCheckout')
  await expect(requestTossPayment(async () => { throw new Error('local validation stop') })).rejects.toThrow('local validation stop')
  expect(sdk.load).not.toHaveBeenCalled()
})

test('a production build cannot enable a synthetic payment by setting the simulation flag', async () => {
  vi.stubEnv('DEV', false)
  vi.stubEnv('VITE_TOSS_SIMULATION', 'true')
  vi.stubEnv('VITE_TOSS_CLIENT_KEY', '')
  const { requestTossPayment } = await import('@/features/payment/lib/tossCheckout')
  await expect(requestTossPayment(async () => prepared)).rejects.toThrow('결제 설정')
  expect(sdk.load).not.toHaveBeenCalled()
})
