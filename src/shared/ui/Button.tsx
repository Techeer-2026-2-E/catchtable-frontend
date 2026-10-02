import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  // TODO: 디자인 시스템 확정 후 스타일링 방식(CSS Modules / Tailwind 등) 적용
  const classes = ['btn', `btn-${variant}`, fullWidth && 'btn-full', className]
    .filter(Boolean)
    .join(' ')
  return <button type={type} className={classes} {...props} />
}
