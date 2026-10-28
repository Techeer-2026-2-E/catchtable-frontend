import { ChevronRight, LogOut, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { STORE_CATEGORY_LABEL } from '@/entities'
import { useAuthStore, useLogout } from '@/features/auth'
import { useMyStores } from '@/features/owner-store'
import { paths, ROUTES } from '@/shared/config'
import { Button, EmptyState, ErrorState, IconButton, ImagePlaceholder, LoadingState, Page, Section, toast, TopBar } from '@/shared/ui'
import styles from './OwnerDashboardPage.module.css'

/** 점주 — 내 매장 목록 */
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
            label="로그아웃"
            icon={<LogOut />}
            onClick={() => logout.mutate(undefined, { onSettled: () => navigate(ROUTES.HOME, { replace: true }) })}
          />
        }
      />
      <p className={`${styles.greeting} t-body-14 text-secondary`}>{owner?.name} 사장님, 오늘도 좋은 하루 되세요</p>
      <Section>
        {isPending && <LoadingState compact />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {stores?.length === 0 && <EmptyState title="등록된 매장이 없어요" description="매장을 등록하고 예약·웨이팅을 받아보세요" />}
        <ul className={styles.list}>
          {stores?.map((store) => (
            <li key={store.id}>
              <Link to={paths.ownerStore(store.id)} className={styles.store}>
                <ImagePlaceholder src={store.thumbnailUrl} className={styles.thumb} radius={8} />
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
        <Button variant="soft" fullWidth leftIcon={<Plus />} onClick={() => toast('매장 등록은 준비 중이에요')}>
          매장 등록
        </Button>
      </Section>
    </Page>
  )
}
