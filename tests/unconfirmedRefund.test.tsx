import { afterEach, beforeEach, expect, test } from 'vitest'
import { AxiosError } from 'axios'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { PaymentDetailPage } from '@/pages/payment-detail'
import { hold, mockApi, payment, renderPaymentPage } from './paymentFixtures'

let restore=()=>{}
beforeEach(()=>localStorage.clear())
afterEach(()=>restore())
const detail={...payment,status:'DONE',reservationId:21,method:'카드',approvedAt:hold.serverTime,refundRequired:true,refunds:[],receiptNotice:'테스트 결제'}
const requested={requestId:51,paymentId:31,reservationId:21,currency:'KRW',refundAmount:10001,refundStatus:'REQUESTED',requestedAt:hold.serverTime,completedAt:null}
function renderDetail(){return renderPaymentPage(<PaymentDetailPage/>,'/payments/:paymentId','/payments/31')}

test('an unconfirmed approved payment offers a full refund request and shows accepted status',async()=>{
  let current:unknown=null
  const posts:{url:string|undefined;body:unknown;key:unknown}[]=[]
  restore=mockApi(config=>{
    if(config.url?.endsWith('/unconfirmed-refund')){
      if(config.method==='post'){posts.push({url:config.url,body:config.data,key:config.headers['Idempotency-Key']});current=requested}
      return current
    }
    return detail
  })
  renderDetail()
  fireEvent.click(await screen.findByRole('button',{name:'전액 환불 요청',exact:true}))
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'환불 요청',exact:true}))
  await screen.findByText('전액 환불 요청을 접수했어요. 처리 결과를 확인해주세요.')
  expect(posts).toHaveLength(1)
  expect(posts[0].key).toEqual(expect.any(String))
  expect(posts[0].body).toBeUndefined()
  expect(screen.queryByRole('button',{name:'전액 환불 요청',exact:true})).toBeNull()
})

test('a lost enqueue response is recovered by status lookup and refresh preserves the same key',async()=>{
  let current:unknown=null
  let posts=0
  restore=mockApi(config=>{
    if(config.url?.endsWith('/unconfirmed-refund')){
      if(config.method==='post'){posts++;current=requested;throw new AxiosError('response lost','ERR_NETWORK')}
      return current
    }
    return detail
  })
  const view=renderDetail()
  fireEvent.click(await screen.findByRole('button',{name:'전액 환불 요청',exact:true}))
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'환불 요청',exact:true}))
  await screen.findByText('전액 환불 요청을 접수했어요. 처리 결과를 확인해주세요.')
  const key=localStorage.getItem('catchtable:refund-key:unconfirmed-refund:31')
  expect(key).toBeTruthy()
  view.unmount();renderDetail()
  await screen.findByText('전액 환불 요청을 접수했어요. 처리 결과를 확인해주세요.')
  expect(localStorage.getItem('catchtable:refund-key:unconfirmed-refund:31')).toBe(key)
  expect(posts).toBe(1)
})

test('unknown refunds offer status checking and keep the request key instead of creating another request',async()=>{
  localStorage.setItem('catchtable:refund-key:unconfirmed-refund:31','same-refund-key')
  restore=mockApi(config=>config.url?.endsWith('/unconfirmed-refund')?{...requested,refundStatus:'UNKNOWN'}:detail)
  renderDetail()
  await screen.findByText('환불 결과를 확인하고 있어요. 새로 요청하지 말고 결과를 확인해주세요.')
  expect(screen.queryByRole('button',{name:'전액 환불 요청',exact:true})).toBeNull()
  expect(localStorage.getItem('catchtable:refund-key:unconfirmed-refund:31')).toBe('same-refund-key')
})

test('a completed refund refreshes payment details and removes the retry key',async()=>{
  localStorage.setItem('catchtable:refund-key:unconfirmed-refund:31','completed-key')
  restore=mockApi(config=>config.url?.endsWith('/unconfirmed-refund')?{...requested,refundStatus:'COMPLETED',completedAt:hold.serverTime}:{...detail,status:'REFUNDED',canceledAmount:10001})
  renderDetail()
  await screen.findByText('예약이 확정되지 않은 결제의 전액 환불을 완료했어요.')
  await waitFor(()=>expect(localStorage.getItem('catchtable:refund-key:unconfirmed-refund:31')).toBeNull())
  expect(screen.queryByRole('button',{name:'전액 환불 요청',exact:true})).toBeNull()
})

test('a normal confirmed payment keeps its existing reservation actions and cannot request an unconfirmed refund',async()=>{
  restore=mockApi(()=>({...detail,refundRequired:false}))
  renderDetail()
  await screen.findByRole('button',{name:'예약 보기'})
  expect(screen.queryByRole('button',{name:'전액 환불 요청',exact:true})).toBeNull()
})

test('only an explicit retry after confirmed failure creates a new key',async()=>{
  localStorage.setItem('catchtable:refund-key:unconfirmed-refund:31','failed-key')
  let current:unknown={...requested,refundStatus:'FAILED'}
  let usedKey:unknown
  restore=mockApi(config=>{
    if(config.url?.endsWith('/unconfirmed-refund')){
      if(config.method==='post'){usedKey=config.headers['Idempotency-Key'];current=requested}
      return current
    }
    return detail
  })
  renderDetail()
  fireEvent.click(await screen.findByRole('button',{name:'다시 전액 환불 요청',exact:true}))
  expect(localStorage.getItem('catchtable:refund-key:unconfirmed-refund:31')).toBe('failed-key')
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'환불 요청',exact:true}))
  await screen.findByText('전액 환불 요청을 접수했어요. 처리 결과를 확인해주세요.')
  expect(usedKey).toEqual(expect.any(String))
  expect(usedKey).not.toBe('failed-key')
})

test('failed request-status lookup blocks a new refund until the saved result is known',async()=>{
  restore=mockApi(config=>{
    if(config.url?.endsWith('/unconfirmed-refund'))throw new AxiosError('lookup failed','ERR_NETWORK')
    return detail
  })
  renderDetail()
  await screen.findByText('환불 요청 내역을 확인하지 못했어요. 먼저 결과를 확인해주세요.')
  expect(screen.queryByRole('button',{name:'전액 환불 요청',exact:true})).toBeNull()
  expect(screen.getByRole('button',{name:'요청 내역 다시 확인'})).toBeTruthy()
})
