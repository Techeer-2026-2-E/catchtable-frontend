import { ANONYMOUS, loadTossPayments } from '@tosspayments/tosspayments-sdk'
import type { PreparedPayment } from '@/entities'
import { env, ROUTES } from '@/shared/config'

/**
 * Toss 결제창 호출 — 성공·실패는 지정한 주소로 돌아옴 (paymentKey·orderId·amount 쿼리 추가)
 * 금액·주문번호는 서버가 준비한 값만 사용한다
 */
export async function requestTossPayment(prepare: () => Promise<PreparedPayment>) {
  // SDK를 기다리는 사이 만료되거나 다른 탭에서 승인을 시작할 수 있다.
  // 창을 열기 직전에 서버의 현재 유효성과 같은 READY 주문을 다시 확인한다.
  if (!env.tossSimulation && !env.tossClientKey) throw new Error('결제 설정이 없어요')
  const toss = env.tossSimulation ? null : await loadTossPayments(env.tossClientKey)
  const prepared = await prepare()
  if (prepared.status !== 'READY' || prepared.remainingSeconds <= 0) {
    throw new Error('결제 시간이 지났어요. 예약 상태를 다시 확인해주세요.')
  }
  const origin = window.location.origin
  const successUrl = `${origin}${ROUTES.PAYMENT_SUCCESS}?holdId=${prepared.holdId}`
  const failUrl = `${origin}${ROUTES.PAYMENT_FAIL}?holdId=${prepared.holdId}`

  if (env.tossSimulation) {
    // 명시적으로 선택한 개발용 fake PG/MSW에서만 합성 키를 사용한다.
    const query = new URLSearchParams({
      paymentKey: `local-${prepared.orderId}`,
      orderId: prepared.orderId,
      amount: String(prepared.amount),
    })
    window.location.assign(`${successUrl}&${query}`)
    return
  }

  await toss!.payment({ customerKey: ANONYMOUS }).requestPayment({
    method: 'CARD',
    amount: { currency: 'KRW', value: prepared.amount },
    orderId: prepared.orderId,
    orderName: prepared.orderName,
    successUrl,
    failUrl,
  })
}
