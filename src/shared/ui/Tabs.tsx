import { cn } from '@/shared/lib/cn'
import styles from './Tabs.module.css'

interface TabItem<T extends string> {
  value: T
  label: string
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  /** fill=탭 폭 균등, 기본은 콘텐츠 폭 */
  fill?: boolean
  className?: string
}

/** 화면 내 콘텐츠 전환. 선택 탭은 갈색 밑줄 2px */
export function Tabs<T extends string>({ items, value, onChange, fill, className }: TabsProps<T>) {
  return (
    <div role="tablist" className={cn(styles.tabs, fill && styles.fill, className)}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={item.value === value}
          className={cn(styles.tab, item.value === value && styles.active)}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
