import { ChevronRight, LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { STORE_CATEGORY_LABEL } from '@/entities'
import { useAuthStore, useLogout } from '@/features/auth'
import { useMyStores } from '@/features/owner-store'
import { paths, ROUTES } from '@/shared/config'
import { EmptyState, ErrorState, IconButton, LoadingState, Page, Section, TopBar } from '@/shared/ui'
import styles from './OwnerDashboardPage.module.css'

/** 점주 — 내 매장 목록 (점주 매장 목록 API 가 없어 VITE_OWNER_STORE_IDS 의 매장) */
export function OwnerDashboardPage() {
  const owner = useAuthStore((s) => s.member)
  const logout = useLogout()
  const navigate = useNavigate()
  const { data: stores, isPending, isError, refetch } = useMyStores()

  return (
    <Page>
      <TopBar
        title="내 매장"
        leading="none"
        large
        actions={
          <IconButton
            label="다른 회원으로 시작"
            icon={<LogOut />}
            onClick={() => {
              logout()
              navigate(ROUTES.LOGIN, { replace: true })
            }}
          />
        }
      />
      <p className={`${styles.greeting} t-body-14 text-secondary`}>{owner?.name} 사장님, 오늘도 좋은 하루 되세요</p>
      <Section>
        {isPending && <LoadingState compact />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {stores?.length === 0 && <EmptyState title="연결된 매장이 없어요" description=".env 의 VITE_OWNER_STORE_IDS 를 확인해주세요" />}
        <ul className={styles.list}>
          {stores?.map((store) => (
            <li key={store.id}>
              <Link to={paths.ownerStore(store.id)} className={styles.store}>
                <div className={styles.text}>
                  <p className="t-headline-16">{store.name}</p>
                  <p className="t-caption-13 text-tertiary">
                    {STORE_CATEGORY_LABEL[store.category]} · {store.address}
                  </p>
                </div>
                <ChevronRight className={styles.chevron} aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </Page>
  )
}
