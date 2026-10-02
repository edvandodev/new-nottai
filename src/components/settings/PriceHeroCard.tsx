import React from 'react'

type PriceHeroCardProps = {
  valueLabel: string
  subtitle?: string
  onEdit?: () => void
}

export function PriceHeroCard({ valueLabel, subtitle, onEdit }: PriceHeroCardProps) {
  return (
    <div
      className='relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900 to-slate-950 shadow-[0_10px_40px_-25px_rgba(21,55,43,0.12)]'
      style={{
        background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow)'
      }}
    >
      <div className='absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(145,226,100,0.12),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(145,226,100,0.08),transparent_25%)]' />
      <div className='relative px-5 py-4 flex items-center justify-between gap-4'>
        <div>
          <p className='text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-500'>
            {'Pre\u00e7o atual'}
          </p>
          <div className='mt-1 text-3xl font-bold text-white leading-tight' style={{ color: 'var(--text)' }}>
            {valueLabel}
          </div>
          {subtitle && (
            <p className='text-sm text-slate-400 mt-1' style={{ color: 'var(--muted)' }}>
              {subtitle}
            </p>
          )}
        </div>
        <button
          type='button'
          onClick={onEdit}
          className='relative z-10 px-4 py-2 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-2)] text-sm font-semibold text-white border border-[var(--primary)] shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]'
        >
          Editar
        </button>
      </div>
    </div>
  )
}
