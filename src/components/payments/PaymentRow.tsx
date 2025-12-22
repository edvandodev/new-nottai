import React from 'react'
import { ArrowDownLeft, ChevronDown, Wallet } from 'lucide-react'

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
  const iconBg = isPending ? 'var(--warning)' : 'var(--accent)'
  const iconColor = isPending ? 'var(--accent-ink)' : 'var(--accent-ink)'
  const textColor = isPending ? 'var(--text)' : 'var(--accent)'
  const containerClassName = variant === 'card' ? 'flat-card overflow-hidden' : ''
  const rowPadding = variant === 'list' ? 'py-4' : 'py-3'
  const dividerColor = variant === 'list' ? 'rgba(255, 255, 255, 0.06)' : 'var(--border)'
  const expandedBg = variant === 'list' ? 'transparent' : 'var(--surface)'

  return (
    <div className={containerClassName}>
      <button
        type='button'
        onClick={onClick}
        className={`w-full px-4 ${rowPadding} flex items-center justify-between gap-3 text-left active:scale-[0.99] transition-transform`}
      >
        <div className='flex items-center gap-3 min-w-0'>
          <div
            className='h-11 w-11 rounded-full flex items-center justify-center shrink-0'
            style={{
              background: iconBg,
              color: iconColor,
              boxShadow: '0 8px 20px -12px var(--shadow)'
            }}
          >
            {isPending ? (
              <ArrowDownLeft size={18} strokeWidth={2.4} />
            ) : (
              <Wallet size={22} strokeWidth={2.4} />
            )}
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
          <span className='text-lg font-semibold tabular-nums' style={{ color: textColor }}>
            {amount}
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
