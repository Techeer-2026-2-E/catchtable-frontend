import styles from './Layout.module.css'

/** 화면 청크를 불러오는 동안 보여줄 자리 — 짧게 끝나므로 스피너만 */
export function PageFallback() {
  return (
    <div className={styles.fallback} role="status" aria-label="불러오는 중">
      <span className={styles.spinner} />
    </div>
  )
}
