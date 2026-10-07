import React from 'react'
import { ArrowDownLeft, ChevronDown } from 'lucide-react'

type PaymentRowProps = {
  name: string
  subtitle: string
  amount: string
  status: 'received' | 'pending'
  pillLabel?: string
  onClick?: () => void
  isExpanded?: boolean
  children?: React.ReactNode
  variant?: 'card' | 'list'
}

export function PaymentRow({
  name,
  subtitle,
  amount,
  status,
  pillLabel = 'Pendente',
  onClick,
  isExpanded = false,
  children,
  variant = 'card'
}: PaymentRowProps) {
  const isPending = status === 'pending'
  const textColor = isPending ? 'var(--text)' : 'var(--primary)'
  const containerClassName = variant === 'card' ? 'flat-card overflow-hidden' : ''
  const rowPadding = variant === 'list' ? 'py-4' : 'py-3'
  const dividerColor = 'var(--border)'
  const expandedBg = variant === 'list' ? 'transparent' : 'var(--surface)'
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase()

  return (
    <div className={containerClassName}>
      <button
        type='button'
        onClick={onClick}
        className={`w-full px-4 ${rowPadding} flex items-center justify-between gap-3 text-left active:scale-[0.99] transition-transform`}
      >
        <div className='flex items-center gap-3 min-w-0'>
          <div
            className='h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold'
            style={{
              background: isPending ? 'var(--accent-soft)' : 'var(--surface-2)',
              color: 'var(--primary)'
            }}
          >
            {initials || <ArrowDownLeft size={16} strokeWidth={2.4} />}
          </div>
          <div className='min-w-0'>
            <p className='text-base font-semibold truncate'>{name}</p>
            <p className='text-sm truncate' style={{ color: 'var(--muted)' }}>
              {subtitle}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2 shrink-0'>
          {isPending && (
            <span className='flat-pill warning px-3 py-1 rounded-full text-xs font-semibold'>
              {pillLabel}
            </span>
          )}
          <span className='text-sm font-semibold tabular-nums whitespace-nowrap' style={{ color: textColor }}>
            {isPending ? '' : '+ '}{amount}
          </span>
          {!isPending && <ChevronDown size={14} style={{ color: 'var(--muted)' }} />}
        </div>
      </button>

      {isExpanded && children && (
        <div
          className='px-4 pb-4 pt-3'
          style={{
            borderTop: `1px solid ${dividerColor}`,
            background: expandedBg
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
