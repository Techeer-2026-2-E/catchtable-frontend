import type { SVGProps } from 'react'
import type { StoreCategory } from '../model'

/**
 * 음식 종류 아이콘 — 직접 그린 선 아이콘
 * 앱 아이콘(lucide)과 같은 규칙: 24×24, 선 굵기 2, 둥근 끝·모서리, currentColor
 */
const PATHS: Record<StoreCategory, React.ReactNode> = {
  // 한식 — 밥 한 공기와 젓가락
  KOREAN: (
    <>
      <path d="M3.5 12h17" />
      <path d="M3.5 12a8.5 7.5 0 0 0 17 0" />
      <path d="M7.5 12a4.5 3.5 0 0 1 9 0" />
      <path d="M10 21.5h4" />
      <path d="M13.5 9 19 2.5" />
      <path d="M15.5 9.5 21.5 4" />
    </>
  ),
  // 일식 — 김을 두른 주먹밥(오니기리)
  JAPANESE: (
    <>
      <path d="M12 3c1.2 0 2.2.6 2.8 1.7l5.9 10.6c1.2 2.2-.4 4.9-2.9 4.9H6.2c-2.5 0-4.1-2.7-2.9-4.9L9.2 4.7C9.8 3.6 10.8 3 12 3Z" />
      <path d="M8.5 20.2V15a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5.2" />
    </>
  ),
  // 중식 — 만두 (주름 셋) 와 접시
  CHINESE: (
    <>
      <path d="M3 15.5C3 10.8 7 7 12 7s9 3.8 9 8.5c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2Z" />
      <path d="M9 7.6 10 11" />
      <path d="M12 7v3.6" />
      <path d="M15 7.6 14 11" />
      <path d="M4 21h16" />
    </>
  ),
  // 양식 — 포크, 접시, 나이프
  WESTERN: (
    <>
      <circle cx="12" cy="12" r="5.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M2.5 3v3.5a1 1 0 0 0 2 0V3" />
      <path d="M3.5 7.5V21" />
      <path d="M21.5 3c-1.4 1.2-2 3.4-2 6.5h2V21" />
    </>
  ),
  // 카페 — 김이 나는 커피잔
  CAFE: (
    <>
      <path d="M4.5 10h12v4.5a5.5 5.5 0 0 1-5.5 5.5h-1a5.5 5.5 0 0 1-5.5-5.5Z" />
      <path d="M16.5 11.5h1.5a2.5 2.5 0 0 1 0 5h-1.8" />
      <path d="M3.5 22.5h14" />
      <path d="M8.5 2.5c-.9 1 .9 2.2 0 3.5" />
      <path d="M12.5 2.5c-.9 1 .9 2.2 0 3.5" />
    </>
  ),
  // 주점 — 거품 올라온 맥주잔
  BAR: (
    <>
      <path d="M5 9h11v10.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" />
      <path d="M16 11h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2" />
      <path d="M5 9c-1.4-2.6.6-5 3-4.2C8.8 3 10.3 2.4 11.6 3c1.3-.9 3.6-.5 4.1 1.6C17.3 5.2 17.2 7.8 16 9" />
      <path d="M8.5 12.5v5.5" />
      <path d="M12.5 12.5v5.5" />
    </>
  ),
  // 기타 — 뚜껑 덮인 요리(클로슈)
  ETC: (
    <>
      <path d="M4 17a8 8 0 0 1 16 0" />
      <path d="M2.5 17h19" />
      <path d="M12 9V7.5" />
      <path d="M10.5 7h3" />
      <path d="M5.5 20.5h13" />
    </>
  ),
}

export function CategoryIcon({ category, ...props }: { category: StoreCategory } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {PATHS[category]}
    </svg>
  )
}
