import React from 'react'
import { ChevronRight } from 'lucide-react'

type SettingsItemProps = {
  icon: React.ReactNode
  title: string
  subtitle?: string
  rightSlot?: React.ReactNode
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
}

export function SettingsItem({
  icon,
  title,
  subtitle,
  rightSlot,
  onClick,
  danger = false,
  disabled = false
}: SettingsItemProps) {
  const isDisabled = disabled
  const isInteractive = !!onClick && !isDisabled

  return (
    <button
      type='button'
      onClick={onClick}
      disabled={isDisabled}
      className={`w-full min-h-[52px] flex items-center gap-3 px-4 py-3.5 text-left transition-all ${
        isInteractive
          ? 'active:scale-[0.995] hover:bg-slate-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60'
          : 'cursor-default'
      } ${isDisabled ? 'opacity-70' : ''}`}
      style={{ color: danger ? 'var(--danger)' : 'var(--text)' }}
    >
      <div
        className='h-11 w-11 rounded-2xl bg-slate-800/70 border border-slate-700/60 flex items-center justify-center text-slate-200 shrink-0'
        style={{
          backgroundColor: 'var(--surface-2)',
          borderColor: 'var(--border)',
          color: danger ? 'var(--danger)' : 'var(--text)'
        }}
      >
        {icon}
      </div>
      <div className='flex-1 min-w-0'>
        <p className='text-sm font-semibold truncate' style={{ color: danger ? 'var(--danger)' : 'var(--text)' }}>
          {title}
        </p>
        {subtitle && (
          <p className='text-xs text-slate-400 leading-tight truncate' style={{ color: 'var(--muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
      <div className='flex items-center gap-2 text-sm text-slate-300 shrink-0'>
        {rightSlot}
        {!rightSlot && (
          <ChevronRight size={18} className='text-slate-500' />
        )}
      </div>
    </button>
  )
}
