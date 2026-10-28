import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App.tsx'
import { env } from './shared/config'

/** 목 API(MSW) 를 켠 경우 서비스 워커가 준비된 뒤 렌더링 — 첫 요청부터 목 응답을 받도록 */
async function prepare() {
  if (!env.apiMocking) return
  const { startMockApi } = await import('./mocks/browser')
  await startMockApi()
}

prepare().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
