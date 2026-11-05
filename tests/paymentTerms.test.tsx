import { afterEach, expect, test } from 'vitest'
import { screen } from '@testing-library/react'
import { PaymentCheckoutPage } from '@/pages/payment-checkout'
import { hold, mockApi, prepared, renderPaymentPage, store } from './paymentFixtures'

let restore=()=>{}
afterEach(()=>restore())
const terms={refundPolicy:'STANDARD',refundPolicyName:'일반',refundRules:[{minDaysBefore:2,refundRate:100},{minDaysBefore:1,refundRate:50},{minDaysBefore:0,refundRate:0}],refundPolicyNotice:'매장 현지시간(Asia/Seoul)의 예약일 기준입니다.'}

test('checkout shows the server snapshot refund policy and the original prepared amount before payment',async()=>{
  restore=mockApi(config=>config.url?.endsWith('/prepare')?{...prepared,...terms}:config.url?.includes('/holds/')?hold:store)
  renderPaymentPage(<PaymentCheckoutPage/>,'/reservations/holds/:holdId/payment','/reservations/holds/21/payment')
  await screen.findByRole('heading',{name:'환불 기준'})
  expect(screen.getByText('일반 환불 정책')).toBeTruthy()
  expect(screen.getByText('2일 전까지 100%')).toBeTruthy()
  expect(screen.getByText('1일 전 50%')).toBeTruthy()
  expect(screen.getByText('예약 당일 0%')).toBeTruthy()
  expect(screen.getByRole('button',{name:'10,001원 결제하기'})).toBeTruthy()
})

test('a legacy response without refund terms blocks starting payment and offers a refresh',async()=>{
  const legacy={...prepared} as Record<string,unknown>
  for(const key of ['refundPolicy','refundPolicyName','refundRules','refundPolicyNotice']) delete legacy[key]
  restore=mockApi(config=>config.url?.endsWith('/prepare')?legacy:config.url?.includes('/holds/')?hold:store)
  renderPaymentPage(<PaymentCheckoutPage/>,'/reservations/holds/:holdId/payment','/reservations/holds/21/payment')
  await screen.findByText('환불 기준을 확인하지 못했어요. 주문을 다시 확인해주세요.')
  const pay=screen.getByRole('button',{name:'10,001원 결제하기'}) as HTMLButtonElement
  expect(pay.disabled).toBe(true)
  expect(screen.getByRole('button',{name:'주문 다시 확인'})).toBeTruthy()
})
