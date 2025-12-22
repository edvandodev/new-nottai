import React from 'react'

type StatCardProps = {
  label: string
  value: string
  variant?: 'accent' | 'neutral'
  valueTone?: 'accent' | 'neutral'
  headerAction?: React.ReactNode
  helperText?: string
  accentTone?: 'green' | 'lime'
}

export function StatCard({
  label,
  value,
  variant = 'neutral',
  valueTone,
  headerAction,
  helperText,
  accentTone
}: StatCardProps) {
  const isAccent = variant === 'accent'
  const hasHeaderAction = Boolean(headerAction)
  const resolvedTone = valueTone ?? 'neutral'
  const valueColor = resolvedTone === 'accent' ? 'var(--accent)' : 'var(--text)'
  const accentColors =
    accentTone === 'lime'
      ? {
          border: 'rgba(184, 255, 44, 0.6)',
          glow: 'rgba(184, 255, 44, 0.45)',
          glowSoft: 'rgba(184, 255, 44, 0.4)'
        }
      : {
          border: 'rgba(34, 197, 94, 0.6)',
          glow: 'rgba(34, 197, 94, 0.45)',
          glowSoft: 'rgba(34, 197, 94, 0.4)'
        }
  return (
    <div
      className={`flat-card p-4 flex flex-col gap-1 relative ${hasHeaderAction ? 'pr-12' : ''}`}
      style={
        isAccent
          ? {
              borderColor: accentColors.border,
              boxShadow: `0 0 0 1px ${accentColors.glowSoft}, 0 14px 30px -26px ${accentColors.glow}`,
              background:
                'linear-gradient(180deg, rgba(18, 24, 33, 0.96) 0%, rgba(14, 19, 26, 0.92) 100%)'
            }
          : undefined
      }
    >
      <span className='text-xs font-semibold tracking-wide uppercase' style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      {headerAction && <div className='absolute right-3 top-3'>{headerAction}</div>}
      <span className='text-2xl font-semibold leading-tight whitespace-nowrap' style={{ color: valueColor }}>
        {value}
      </span>
      {helperText && (
        <span className='text-xs' style={{ color: 'var(--muted)' }}>
          {helperText}
        </span>
      )}
    </div>
  )
}
