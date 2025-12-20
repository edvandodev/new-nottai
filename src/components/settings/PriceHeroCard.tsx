import React from 'react'

type PriceHeroCardProps = {
  valueLabel: string
  subtitle?: string
  onEdit?: () => void
}

export function PriceHeroCard({ valueLabel, subtitle, onEdit }: PriceHeroCardProps) {
  return (
    <div
      className='relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900 to-slate-950 shadow-[0_10px_40px_-25px_rgba(0,0,0,0.8)]'
      style={{
        background: 'linear-gradient(135deg, rgba(17,24,39,0.9), rgba(12,17,30,0.95))',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow)'
      }}
    >
      <div className='absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.12),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.08),transparent_25%)]' />
      <div className='relative px-5 py-4 flex items-center justify-between gap-4'>
        <div>
          <p className='text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-500'>
            Preco atual
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
          className='relative z-10 px-4 py-2 rounded-full bg-blue-600/90 hover:bg-blue-500 text-sm font-semibold text-white border border-blue-500/60 shadow-[0_10px_30px_-12px_rgba(59,130,246,0.8)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400'
        >
          Editar
        </button>
      </div>
    </div>
  )
}
