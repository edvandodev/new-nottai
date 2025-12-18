import React, { useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  DollarSign,
  Droplets
} from 'lucide-react'
import type { Payment, Sale } from '@/types'
import { MonthYearFilterButtons } from '@/components/MonthYearFilterButtons'

type ReportsPageProps = {
  sales: Sale[]
  payments: Payment[]
}

const parseDate = (
  value: string | number | Date | { seconds?: number; nanoseconds?: number }
) => {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value === 'string') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    const millis =
      value.seconds * 1000 +
      (typeof value.nanoseconds === 'number'
        ? Math.floor(value.nanoseconds / 1_000_000)
        : 0)
    const d = new Date(millis)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

const computeMonthTotals = (
  data: Sale[],
  year: number,
  month: number
): { liters: number; value: number } => {
  return data.reduce(
    (acc, cur) => {
      const d = parseDate(cur.date as any)
      if (d && d.getFullYear() === year && d.getMonth() === month) {
        acc.liters += cur.liters
        acc.value += cur.totalValue
      }
      return acc
    },
    { liters: 0, value: 0 }
  )
}

type ChangeDirection = 'up' | 'down' | 'flat'

const computeChange = (
  current: number,
  previous: number
): { direction: ChangeDirection; percent: number } => {
  if (previous === 0 && current > 0) return { direction: 'up', percent: 100 }
  if (current === 0 && previous > 0) return { direction: 'down', percent: 100 }
  if (current === 0 && previous === 0) return { direction: 'flat', percent: 0 }

  const diff = current - previous
  const direction: ChangeDirection = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
  const percent = Math.round((Math.abs(diff) / previous) * 100)
  return { direction, percent }
}

type StatsSummaryCardProps = {
  title: string
  icon: React.ReactNode
  accent: 'blue' | 'green'
  mainValue: string
  previousValue: string
  change: { direction: ChangeDirection; percent: number }
}

const StatsSummaryCard = ({
  title,
  icon,
  accent,
  mainValue,
  previousValue,
  change
}: StatsSummaryCardProps) => {
  const accentText =
    accent === 'blue' ? 'text-blue-100' : 'text-green-100'
  const accentIconBg =
    accent === 'blue' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'
  const accentBorder =
    accent === 'blue' ? 'border-blue-500/30 bg-blue-900/15' : 'border-green-500/30 bg-green-900/15'

  const changeColor =
    change.direction === 'up'
      ? 'text-emerald-400'
      : change.direction === 'down'
      ? 'text-red-400'
      : 'text-slate-400'

  const renderChangeIcon = () => {
    if (change.direction === 'up') return <ArrowUpRight size={16} />
    if (change.direction === 'down') return <ArrowDownRight size={16} />
    return null
  }

  const sign =
    change.direction === 'down' ? '-' : change.direction === 'up' ? '+' : ''
  const percentLabel = `${sign}${change.percent}%`

  return (
    <div
      className={`rounded-2xl p-4 border ${accentBorder} flex flex-col gap-3 shadow-sm overflow-hidden`}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='space-y-1 flex-1 min-w-0'>
          <p className='text-xs uppercase tracking-wide text-slate-400 font-semibold'>
            {title}
          </p>
          <p
            className={`text-xl font-extrabold ${accentText} whitespace-nowrap overflow-hidden text-ellipsis`}
            title={mainValue}
          >
            {mainValue}
          </p>
        </div>
        <div
          className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${accentIconBg}`}
        >
          {icon}
        </div>
      </div>

      <div className='h-px w-full bg-slate-700/70' />

      <div className='space-y-1'>
        <p className='text-slate-400 text-xs font-medium'>
          Mês passado{' '}
          <span className={accent === 'blue' ? 'text-blue-200' : 'text-green-200'}>
            {previousValue}
          </span>
        </p>
        <div className='flex items-center gap-2 text-sm font-semibold'>
          <span className={changeColor} aria-label='Variacao percentual'>
            {renderChangeIcon()}
          </span>
          <span className={changeColor}>{percentLabel}</span>
        </div>
      </div>
    </div>
  )
}

export function ReportsPage({ sales, payments }: ReportsPageProps) {
  const [reportYear, setReportYear] = useState(new Date().getFullYear())
  const [reportMonth, setReportMonth] = useState(new Date().getMonth())

  const mergedSales = useMemo(() => {
    const byId = new Map<string, Sale>()
    sales.forEach((s) => byId.set(s.id, s))
    payments.forEach((p) =>
      p.salesSnapshot?.forEach((s: Sale) => {
        if (!byId.has(s.id)) byId.set(s.id, s)
      })
    )
    return Array.from(byId.values())
  }, [sales, payments])

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const { reportData, previousTotals } = useMemo(() => {
    const filtered = mergedSales.filter((s) => {
      const d = parseDate(s.date as any)
      if (!d) return false
      return d.getFullYear() === reportYear && d.getMonth() === reportMonth
    })

    const totalLiters = filtered.reduce((acc, cur) => acc + cur.liters, 0)
    const totalValue = filtered.reduce((acc, cur) => acc + cur.totalValue, 0)

    const weeks: Record<
      number,
      { liters: number; value: number; label: string }
    > = {}
    filtered.forEach((s) => {
      const d = parseDate(s.date as any)
      if (!d) return
      const weekNum = Math.ceil(d.getDate() / 7)
      if (!weeks[weekNum])
        weeks[weekNum] = { liters: 0, value: 0, label: `Semana ${weekNum}` }
      weeks[weekNum].liters += s.liters
      weeks[weekNum].value += s.totalValue
    })

    const prevMonth = reportMonth === 0 ? 11 : reportMonth - 1
    const prevYear = reportMonth === 0 ? reportYear - 1 : reportYear
    const previous = computeMonthTotals(mergedSales, prevYear, prevMonth)

    return {
      reportData: {
        totalLiters,
        totalValue,
        weeks: Object.values(weeks).sort((a, b) => a.label.localeCompare(b.label))
      },
      previousTotals: previous
    }
  }, [mergedSales, reportMonth, reportYear])

  const litersChange = computeChange(reportData.totalLiters, previousTotals.liters)
  const valueChange = computeChange(reportData.totalValue, previousTotals.value)

  return (
    <div className='space-y-6 animate-fade-in'>
      <MonthYearFilterButtons
        month={reportMonth}
        year={reportYear}
        onChangeMonth={setReportMonth}
        onChangeYear={setReportYear}
      />

      <div className='grid grid-cols-2 gap-4'>
        <StatsSummaryCard
          title='Total Litros'
          icon={<Droplets size={12} />}
          accent='blue'
          mainValue={`${reportData.totalLiters} L`}
          previousValue={`${previousTotals.liters} L`}
          change={litersChange}
        />
        <StatsSummaryCard
          title='Valor Total'
          icon={<DollarSign size={12} />}
          accent='green'
          mainValue={formatCurrency(reportData.totalValue)}
          previousValue={formatCurrency(previousTotals.value)}
          change={valueChange}
        />
      </div>

      <div>
        <div className='flex items-center gap-2 mb-3'>
          <BarChart3 size={18} className='text-slate-500' />
          <h3 className='text-slate-400 text-sm font-bold uppercase tracking-wider'>
            Desempenho por Semana
          </h3>
        </div>

        {reportData.weeks.length === 0 ? (
          <div className='bg-slate-900/50 rounded-xl p-8 text-center border border-slate-800 border-dashed'>
            <p className='text-slate-500'>
              Nenhuma venda registrada neste periodo.
            </p>
          </div>
        ) : (
          <div className='space-y-3'>
            {reportData.weeks.map((week, idx) => (
              <div
                key={idx}
                className='bg-slate-800 rounded-xl p-4 border border-slate-700 flex justify-between items-center'
              >
                <div className='flex flex-col'>
                  <span className='text-white font-bold'>{week.label}</span>
                  <span className='text-slate-500 text-xs mt-0.5'>
                    {week.liters}{' '}
                    {week.liters === 1 ? 'Litro vendido' : 'Litros vendidos'}
                  </span>
                </div>
                <div className='px-3 py-1 bg-slate-900 rounded-lg border border-slate-700'>
                  <span className='text-green-400 font-bold'>
                    {formatCurrency(week.value)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
