import dayjs from 'dayjs'
import 'dayjs/locale/ko'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.locale('ko')
dayjs.extend(relativeTime)

export { dayjs }

/** 매장 시간대 — 백엔드 STORE_ZONE(Asia/Seoul) 과 맞춤 */
export const STORE_UTC_OFFSET = '+09:00'

/** "2026-10-03" + "18:00" → "2026-10-03T18:00:00+09:00" (백엔드 OffsetDateTime) */
export const toStoreDateTime = (date: string, time: string) =>
  `${date}T${time.length === 5 ? `${time}:00` : time}${STORE_UTC_OFFSET}`
