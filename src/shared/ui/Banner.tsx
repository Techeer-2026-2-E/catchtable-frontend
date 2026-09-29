import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import styles from './Banner.module.css'

/** info=일반 안내(중립), notice=주목 필요(노랑), success=완료, danger=경고 */
type BannerTone = 'info' | 'notice' | 'success' | 'danger'

const ICONS: Record<BannerTone, ReactNode> = {
  info: <Info />,
  notice: <CircleAlert />,
  success: <CircleCheck />,
  danger: <CircleAlert />,
}

interface BannerProps {
  tone?: BannerTone
  children: ReactNode
  icon?: ReactNode
  /** 우측 액션 영역 */
  action?: ReactNode
  className?: string
}

/** 화면 상단·폼 위 인라인 안내. 아이콘 색으로 톤 구분, 본문은 text/primary */
export function Banner({ tone = 'info', children, icon, action, className }: BannerProps) {
  return (
    <div className={cn(styles.banner, styles[tone], className)} role={tone === 'danger' ? 'alert' : 'status'}>
      <span className={styles.icon}>{icon ?? ICONS[tone]}</span>
      <div className={styles.body}>{children}</div>
      {action}
    </div>
  )
}
