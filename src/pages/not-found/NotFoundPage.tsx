import { Link } from 'react-router'
import { ROUTES } from '@/shared/config'

export function NotFoundPage() {
  return (
    <main>
      <h1>페이지를 찾을 수 없어요</h1>
      <Link to={ROUTES.HOME}>홈으로</Link>
    </main>
  )
}
