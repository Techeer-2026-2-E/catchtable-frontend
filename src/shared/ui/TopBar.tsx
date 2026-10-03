import type { ReactNode } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import { useNavigate } from 'react-router'
import { cn } from '@/shared/lib/cn'
import { IconButton } from './IconButton'
import styles from './TopBar.module.css'

interface TopBarProps {
  title?: ReactNode
  /** back=뒤로가기(하위 화면), close=닫기(모달성 화면), none=없음(탭 메인 화면) */
  leading?: 'back' | 'close' | 'none'
  /** leading 버튼 동작 — 기본은 history back */
  onLeadingClick?: () => void
  actions?: ReactNode
  /** 탭 메인 화면 — 제목을 Title/20 으로 크게 */
  large?: boolean
  /** 이미지 위에 겹치는 투명 상단바 */
  transparent?: boolean
  className?: string
}

/** 높이 56 고정. Back=하위 화면(뒤로가기+제목+액션), Main=탭 화면 제목 */
export function TopBar({
  title,
  leading = 'back',
  onLeadingClick,
  actions,
  large = false,
  transparent = false,
  className,
}: TopBarProps) {
  const navigate = useNavigate()
  const handleLeading = onLeadingClick ?? (() => navigate(-1))

  return (
    <header className={cn(styles.topBar, transparent && styles.transparent, className)}>
      {leading !== 'none' && (
        <IconButton
          label={leading === 'back' ? '뒤로 가기' : '닫기'}
          icon={leading === 'back' ? <ArrowLeft /> : <X />}
          onClick={handleLeading}
          className={styles.leading}
        />
      )}
      {title && <h1 className={cn(styles.title, large ? 't-title-20' : 't-title-18')}>{title}</h1>}
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  )
}
