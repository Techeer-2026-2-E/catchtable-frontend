import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import styles from './Page.module.css'

interface PageProps {
  children: ReactNode
  /** 하단 고정 CTA 영역 */
  bottom?: ReactNode
  /** 본문 좌우 여백 16 적용 여부 */
  padded?: boolean
  className?: string
}

/** 화면 뼈대 — 414 기준 모바일 레이아웃, 하단 CTA 고정 */
export function Page({ children, bottom, padded = false, className }: PageProps) {
  return (
    <div className={cn(styles.page, bottom != null && styles.hasBottom)}>
      <main className={cn(styles.content, padded && styles.padded, className)}>{children}</main>
      {bottom != null && <div className={styles.bottom}>{bottom}</div>}
    </div>
  )
}

/** 섹션 — 제목 + 본문 */
export function Section({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn(styles.section, className)}>
      {(title || action) && (
        <div className={styles.sectionHeader}>
          {title && <h2 className="t-headline-16">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

/** 섹션 사이 8px 회색 구분 영역 */
export function Divider({ thick = false }: { thick?: boolean }) {
  return <hr className={cn(styles.divider, thick && styles.thick)} />
}
