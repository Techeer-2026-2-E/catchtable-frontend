import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/shared/lib/cn'
import styles from './ListItem.module.css'

interface ListItemProps {
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  /** 우측 값 (예: "6개 테이블") */
  value?: ReactNode
  /** 우측에 화살표 대신 넣을 요소 (Toggle 등) */
  trailing?: ReactNode
  to?: string
  onClick?: () => void
  className?: string
}

/** 설정·메뉴 목록 한 줄. 높이 56 (설명 있으면 hug) */
export function ListItem({ title, description, icon, value, trailing, to, onClick, className }: ListItemProps) {
  const body = (
    <>
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.text}>
        <span className="t-body-15">{title}</span>
        {description && <span className="t-caption-13 text-tertiary">{description}</span>}
      </span>
      {value != null && <span className={cn(styles.value, 't-caption-13')}>{value}</span>}
      {trailing ?? ((to || onClick) && <ChevronRight className={styles.chevron} />)}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={cn(styles.item, styles.interactive, className)}>
        {body}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(styles.item, styles.interactive, className)}>
        {body}
      </button>
    )
  }
  return <div className={cn(styles.item, className)}>{body}</div>
}
