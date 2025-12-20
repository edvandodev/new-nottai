import React from 'react'

type StatCardProps = {
  label: string
  value: string
  variant?: 'accent' | 'neutral'
}

export function StatCard({ label, value, variant = 'neutral' }: StatCardProps) {
  const isAccent = variant === 'accent'

  return (
    <div
      className='flat-card p-4 flex flex-col gap-2'
      style={
        isAccent
          ? {
              borderColor: 'var(--accent)',
              boxShadow: '0 0 0 1px var(--accent)',
              background: 'var(--surface)'
            }
          : undefined
      }
    >
      <span className='text-xs font-medium tracking-wide uppercase' style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      <span
        className='text-2xl font-semibold leading-tight'
        style={{ color: isAccent ? 'var(--accent)' : 'var(--text)' }}
      >
        {value}
      </span>
    </div>
  )
}
