import React from 'react'

type PriceHeroCardProps = {
  valueLabel: string
  subtitle?: string
  onEdit?: () => void
}

export function PriceHeroCard({ valueLabel, subtitle, onEdit }: PriceHeroCardProps) {
  return (
    <div
      className='relative overflow-hidden rounded-2xl border shadow-sm'
      style={{
        background: 'linear-gradient(135deg, #eff6d9 0%, #ffffff 88%)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow)'
      }}
    >
      <div className='absolute inset-y-0 left-0 w-1.5' style={{ background: 'var(--accent)' }} />
      <div className='relative px-5 py-4 pl-6 flex items-center justify-between gap-4'>
        <div>
          <p className='text-[11px] uppercase tracking-[0.08em] font-semibold' style={{ color: 'var(--muted)' }}>
            {'Preço atual'}
          </p>
          <div className='mt-1 text-3xl font-bold leading-tight' style={{ color: 'var(--text)' }}>
            {valueLabel}
          </div>
          {subtitle && (
            <p className='text-sm mt-1' style={{ color: 'var(--muted)' }}>
              {subtitle}
            </p>
          )}
        </div>
        <button
          type='button'
          onClick={onEdit}
          className='relative z-10 px-4 py-2 rounded-full text-sm font-semibold active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2'
          style={{ background: 'var(--primary)', color: '#fff', border: '1px solid var(--primary)' }}
        >
          Editar
        </button>
      </div>
    </div>
  )
}
