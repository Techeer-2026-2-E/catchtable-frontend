import { useEffect } from 'react'
import { Check } from 'lucide-react'
import styles from './Toast.module.css'
import { useToastStore } from './toastStore'

/** 레이아웃에 한 번만 배치. 하단 탭바 위 16px, 3초 후 사라짐 */
export function ToastViewport() {
  const { message, key, hide } = useToastStore()

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(hide, 3000)
    return () => window.clearTimeout(timer)
  }, [message, key, hide])

  if (!message) return null
  return (
    <div key={key} className={styles.toast} role="status">
      <Check aria-hidden />
      {message}
    </div>
  )
}
