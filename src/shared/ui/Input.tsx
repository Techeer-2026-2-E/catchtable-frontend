import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, id, ...props }: InputProps) {
  return (
    <div className="input-field">
      {label && <label htmlFor={id}>{label}</label>}
      <input id={id} aria-invalid={!!error} {...props} />
      {error && <p className="input-error">{error}</p>}
    </div>
  )
}
