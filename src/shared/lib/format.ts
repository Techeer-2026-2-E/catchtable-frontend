import { dayjs } from './dayjs'

/** 15000 → "15,000원" */
export const formatPrice = (value: number) => `${value.toLocaleString('ko-KR')}원`

/** "2026-09-26" → "9월 26일 (토)" */
export const formatDate = (date: string | Date, template = 'M월 D일 (dd)') =>
  dayjs(date).format(template)

/** "18:30:00" | Date → "오후 6:30" */
export const formatTime = (time: string | Date) => {
  const value = typeof time === 'string' && !time.includes('T') ? `1970-01-01T${time}` : time
  return dayjs(value).format('A h:mm')
}

/** "01012345678" → "010-1234-5678" */
export const formatPhone = (phone: string) =>
  phone.replace(/\D/g, '').replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3')
