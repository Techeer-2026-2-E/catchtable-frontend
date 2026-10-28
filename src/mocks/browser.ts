import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { advanceDemoQueues, tick } from './logic'

/**
 * 목 API 시작 — /api 로 가는 요청만 가로채고 나머지(폰트·이미지 등)는 그대로 통과
 * 데모용 대기열 진행·만료 처리는 5초마다
 */
export async function startMockApi() {
  const worker = setupWorker(...handlers)
  await worker.start({
    onUnhandledFrame: 'bypass',
    quiet: true,
  })
  window.setInterval(() => {
    tick()
    advanceDemoQueues()
  }, 5_000)
  console.info('%c[목 API] MSW 가 /api 요청을 처리하고 있어요. 초기화: window.__mockDb.reset()', 'color:#6b4226')
}
