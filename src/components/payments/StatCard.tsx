import React from 'react'

type StatCardProps = {
  label: string
  value: string
  variant?: 'accent' | 'neutral'
  valueTone?: 'accent' | 'neutral'
  headerAction?: React.ReactNode
}

export function StatCard({ label, value, variant = 'neutral', valueTone, headerAction }: StatCardProps) {
  const isAccent = variant === 'accent'
  const resolvedTone = valueTone ?? (isAccent ? 'accent' : 'neutral')
  const valueColor = resolvedTone === 'accent' ? 'var(--accent)' : isAccent ? 'var(--accent)' : 'var(--text)'
  return (
    <div
      className='flat-card p-4 pr-16 flex flex-col gap-1 relative'
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
      <span className='text-xs font-semibold tracking-wide uppercase' style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      {headerAction && <div className='absolute right-3 top-3'>{headerAction}</div>}
      <span className='text-3xl font-semibold leading-tight' style={{ color: valueColor }}>
        {value}
      </span>
    </div>
  )
}
