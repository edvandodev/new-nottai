import React, { useEffect, useMemo, useRef, useState } from 'react'

const MONTHS_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez'
]

type MonthYearFilterButtonsProps = {
  month: number
  year: number
  onChangeMonth: (month: number) => void
  onChangeYear: (year: number) => void
}

export const MonthYearFilterButtons = ({
  month,
  year,
  onChangeMonth,
  onChangeYear
}: MonthYearFilterButtonsProps) => {
  const [openMenu, setOpenMenu] = useState<'month' | 'year' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const years = useMemo(() => {
    const current = new Date().getFullYear()
    const fallback = Array.from({ length: 10 }, (_, idx) => current - idx)
    if (!fallback.includes(year)) fallback.unshift(year)
    return Array.from(new Set(fallback)).sort((a, b) => b - a)
  }, [year])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenMenu(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const baseButtonClasses =
    'rounded-full border border-slate-700/80 bg-slate-900/60 px-3 py-1.5 text-sm font-semibold text-white flex items-center justify-center gap-2 shadow-sm transition-colors min-w-[92px] h-9'

  const periodLabel = 'Per\u00edodo'

  return (
    <div
      ref={containerRef}
      className='flex items-center gap-4 w-full flex-nowrap overflow-visible'
    >
      <span className='text-slate-100 text-2xl font-bold leading-none'>{periodLabel}</span>

      <div className='flex items-center gap-3 ml-auto'>
        <div className='relative'>
          <button
            type='button'
            className={`${baseButtonClasses} hover:border-blue-500/70 hover:bg-slate-800/70 ${
              openMenu === 'month'
                ? 'border-blue-400 bg-slate-800/80 shadow-blue-900/30 shadow-sm'
                : ''
            }`}
            onClick={() => setOpenMenu(openMenu === 'month' ? null : 'month')}
          >
            <span className='text-base font-semibold'>{MONTHS_SHORT[month]}</span>
          </button>

          {openMenu === 'month' && (
            <div className='absolute left-0 mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 shadow-2xl z-20 overflow-hidden'>
              <div className='max-h-60 overflow-y-auto custom-scrollbar'>
                {MONTHS_SHORT.map((label, idx) => (
                  <button
                    key={label}
                    type='button'
                    onClick={() => {
                      onChangeMonth(idx)
                      setOpenMenu(null)
                    }}
                    className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between hover:bg-slate-800/80 transition-colors ${
                      idx === month ? 'bg-slate-800/70 text-blue-200 font-semibold' : 'text-slate-200'
                    }`}
                  >
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className='relative'>
          <button
            type='button'
            className={`${baseButtonClasses} hover:border-blue-500/70 hover:bg-slate-800/70 ${
              openMenu === 'year'
                ? 'border-blue-400 bg-slate-800/80 shadow-blue-900/30 shadow-sm'
                : ''
            }`}
            onClick={() => setOpenMenu(openMenu === 'year' ? null : 'year')}
          >
            <span className='text-base font-semibold'>{year}</span>
          </button>

          {openMenu === 'year' && (
            <div className='absolute left-0 mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 shadow-2xl z-20 overflow-hidden'>
              <div className='max-h-60 overflow-y-auto custom-scrollbar'>
                {years.map((y) => (
                  <button
                    key={y}
                    type='button'
                    onClick={() => {
                      onChangeYear(y)
                      setOpenMenu(null)
                    }}
                    className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between hover:bg-slate-800/80 transition-colors ${
                      y === year ? 'bg-slate-800/70 text-blue-200 font-semibold' : 'text-slate-200'
                    }`}
                  >
                    <span>{y}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
