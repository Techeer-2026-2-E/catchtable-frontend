interface LogoProps {
  /** 한 변 길이(px). 홈 상단은 40 */
  size?: number
  className?: string
}

/**
 * 캐치테이블 로고 마크 (번호표 모양 C) — Figma Components > CT 07 Logo, Mark=ticket
 * 색은 브랜드 토큰(primary 노랑, on-primary 갈색)을 따른다
 */
export function Logo({ size = 40, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="캐치테이블"
      className={className}
    >
      <path
        d="M10 0h20a10 10 0 0 1 10 10v6a4 4 0 0 0 0 8v6a10 10 0 0 1-10 10H10A10 10 0 0 1 0 30v-6a4 4 0 0 0 0-8v-6A10 10 0 0 1 10 0Z"
        fill="var(--color-primary-default)"
      />
      <path
        d="M27.66 13.57a10 10 0 1 0 0 12.86"
        stroke="var(--color-text-on-primary)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
