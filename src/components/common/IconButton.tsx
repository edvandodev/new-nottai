import React from 'react'

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: React.ReactNode
}

export function IconButton({ icon, className = '', children, ...props }: IconButtonProps) {
  const disabled = props.disabled

  return (
    <button
      type='button'
      {...props}
      className={`h-11 w-11 rounded-full inline-flex items-center justify-center font-semibold text-sm shadow-sm transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'
      } ${className}`}
      style={{
        backgroundColor: 'var(--accent)',
        color: 'var(--accent-ink)',
        border: `1px solid var(--accent)`,
        ...(props.style || {})
      }}
    >
      <span>{icon ?? children}</span>
    </button>
  )
}
