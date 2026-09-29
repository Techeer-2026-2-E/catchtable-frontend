import { ChevronRight, LogOut, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { STORE_CATEGORY_LABEL } from '@/entities'
import { MOCK_OWNER, MOCK_STORES } from '@/entities/mock'
import { useAuthStore } from '@/features/auth'
import { paths, ROUTES } from '@/shared/config'
import { Button, IconButton, ImagePlaceholder, Page, Section, toast, TopBar } from '@/shared/ui'
import styles from './OwnerDashboardPage.module.css'

// TODO(API 연동): useMyStores()
const MY_STORES = MOCK_STORES.filter((s) => s.id === 2 || s.id === 4)

/** 점주 — 내 매장 목록 */
export function OwnerDashboardPage() {
  const owner = useAuthStore((s) => s.member) ?? MOCK_OWNER
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const navigate = useNavigate()

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
            onClick={() => {
              // TODO(API 연동): useLogout()
              clearAuth()
              navigate(ROUTES.HOME, { replace: true })
            }}
          />
        }
      />
      <p className={`${styles.greeting} t-body-14 text-secondary`}>{owner.name} 사장님, 오늘도 좋은 하루 되세요</p>
      <Section>
        <ul className={styles.list}>
          {MY_STORES.map((store) => (
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
