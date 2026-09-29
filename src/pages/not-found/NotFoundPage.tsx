import { SearchX } from 'lucide-react'
import { useNavigate } from 'react-router'
import { ROUTES } from '@/shared/config'
import { Button, EmptyState, Page } from '@/shared/ui'
import styles from './NotFoundPage.module.css'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className={styles.frame}>
      <Page>
        <div className={styles.center}>
          <EmptyState icon={<SearchX />} title="페이지를 찾을 수 없어요" description="주소가 바뀌었거나 삭제된 페이지예요" />
          <Button variant="soft" size="M" onClick={() => navigate(ROUTES.HOME, { replace: true })}>
            홈으로
          </Button>
        </div>
      </Page>
    </div>
  )
}
