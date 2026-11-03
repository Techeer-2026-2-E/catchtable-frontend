import { ANONYMOUS, loadTossPayments } from '@tosspayments/tosspayments-sdk'
import type { PreparedPayment } from '@/entities'
import { env, ROUTES } from '@/shared/config'

/**
 * Toss 결제창 호출 — 성공·실패는 지정한 주소로 돌아옴 (paymentKey·orderId·amount 쿼리 추가)
 * 금액·주문번호는 서버가 준비한 값만 사용한다
 */
export async function requestTossPayment(prepared: PreparedPayment) {
  const origin = window.location.origin
  const successUrl = `${origin}${ROUTES.PAYMENT_SUCCESS}?holdId=${prepared.holdId}`
  const failUrl = `${origin}${ROUTES.PAYMENT_FAIL}?holdId=${prepared.holdId}`

  if (!env.tossClientKey) {
    if (!import.meta.env.DEV) throw new Error('결제 설정이 없어요')
    // 로컬 전용: 결제창 없이 승인 단계로 이동. 승인 여부는 여전히 서버(가짜 Toss·목 API)가 판단한다
    const query = new URLSearchParams({
      paymentKey: `local-${prepared.orderId}`,
      orderId: prepared.orderId,
      amount: String(prepared.amount),
    })
    window.location.assign(`${successUrl}&${query}`)
    return
  }

  const toss = await loadTossPayments(env.tossClientKey)
  await toss.payment({ customerKey: ANONYMOUS }).requestPayment({
    method: 'CARD',
    amount: { currency: 'KRW', value: prepared.amount },
    orderId: prepared.orderId,
    orderName: prepared.orderName,
    successUrl,
    failUrl,
  })
}
