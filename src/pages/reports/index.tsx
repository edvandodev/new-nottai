import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Droplets,
  ChevronDown
} from 'lucide-react'
import type { Payment, Sale } from '@/types'
import './reports.css'

type ReportsPageProps = {
  sales: Sale[]
  payments: Payment[]
}

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MONTHS_FULL = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
]

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

const filterSalesByMonth = (sales: Sale[], year: number, monthIndex: number) =>
  sales.filter((s) => {
    const d = parseDate(s.date as any)
    if (!d) return false
    return d.getFullYear() === year && d.getMonth() === monthIndex
  })

const getMonthlyTotals = (sales: Sale[], year: number) => {
  const totals = Array.from({ length: 12 }, () => ({ totalValue: 0, totalLiters: 0 }))
  sales.forEach((s) => {
    const d = parseDate(s.date as any)
    if (!d) return
    if (d.getFullYear() !== year) return
    const idx = d.getMonth()
    totals[idx].totalValue += s.totalValue
    totals[idx].totalLiters += s.liters
  })
  return totals
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

type ViewMode = 'month' | 'week'

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const formatLiters = (value: number) => value.toLocaleString('pt-BR') + ' L'

function StatsSummaryCard({ title, icon, value, previous, change }: {
  title: string
  icon: React.ReactNode
  value: string
  previous: string
  change: ReturnType<typeof computeChange>
}) {
  const changeLabel = (change.direction === 'up' ? '+' : change.direction === 'down' ? '−' : '') + change.percent + '%'
  return (
    <article className='report-stat'>
      <div className='report-stat-label'><span>{icon}</span>{title}</div>
      <strong>{value}</strong>
      <div className='report-previous'>
        <span>Mês anterior <b>{previous}</b></span>
        <span className='report-change' data-direction={change.direction}>
          {change.direction === 'up' && <ArrowUpRight size={14} aria-hidden='true' />}
          {change.direction === 'down' && <ArrowDownRight size={14} aria-hidden='true' />}
          {changeLabel}
        </span>
      </div>
    </article>
  )
}

export function ReportsPage({ sales, payments }: ReportsPageProps) {
  const [reportDate, setReportDate] = useState(() => ({
    year: new Date().getFullYear(),
    month: new Date().getMonth()
  }))
  const reportYear = reportDate.year
  const reportMonth = reportDate.month
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false)
  const monthYearRef = useRef<HTMLDivElement | null>(null)
  const periodButtonRef = useRef<HTMLButtonElement>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('month')

  function changeMonth(offset: number) {
    setShowMonthYearPicker(false)
    setReportDate(({ year, month }) => {
      const date = new Date(year, month + offset, 1)
      return { year: date.getFullYear(), month: date.getMonth() }
    })
  }

  useEffect(() => {
    if (!showMonthYearPicker) return

    function closeOutside(event: PointerEvent) {
      if (!monthYearRef.current?.contains(event.target as Node)) setShowMonthYearPicker(false)
    }

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setShowMonthYearPicker(false)
      periodButtonRef.current?.focus()
    }

    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeWithEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeWithEscape)
    }
  }, [showMonthYearPicker])

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

  const { reportData, previousTotals } = useMemo(() => {
    const filtered = filterSalesByMonth(mergedSales, reportYear, reportMonth)

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

  const monthlyTotals = useMemo(
    () => getMonthlyTotals(mergedSales, reportYear),
    [mergedSales, reportYear]
  )
  const maxValue = Math.max(...monthlyTotals.map((month) => month.totalValue), 0)

  return (
    <div className='reports-page'>
      <header className='ui-page-heading'>
        <h1>Relatórios</h1>
        <p>Acompanhe o volume e o valor das vendas.</p>
      </header>

      <div className='report-period' ref={monthYearRef}>
        <div className='report-period-label'><CalendarDays size={19} aria-hidden='true' /> Período</div>
        <div className='report-period-controls' role='group' aria-label='Navegação por mês'>
          <button type='button' className='ui-icon-button' aria-label='Mês anterior' onClick={() => changeMonth(-1)}>
            <ChevronLeft size={20} aria-hidden='true' />
          </button>
          <button
            type='button'
            ref={periodButtonRef}
            className='report-period-button'
            aria-label={'Selecionar mês e ano. Período atual: ' + MONTHS_FULL[reportMonth] + ' de ' + reportYear}
            aria-expanded={showMonthYearPicker}
            aria-controls={showMonthYearPicker ? 'report-period-picker' : undefined}
            onClick={() => setShowMonthYearPicker((open) => !open)}
          >
            <span>{MONTHS_FULL[reportMonth]} <span>{reportYear}</span></span>
            <ChevronDown size={15} aria-hidden='true' />
          </button>
          <button type='button' className='ui-icon-button' aria-label='Próximo mês' onClick={() => changeMonth(1)}>
            <ChevronRight size={20} aria-hidden='true' />
          </button>
          {showMonthYearPicker && (
            <div className='report-picker' id='report-period-picker' role='group' aria-label='Selecionar período'>
              <div className='report-picker-year'>
                <button type='button' className='ui-icon-button' aria-label='Ano anterior' onClick={() => setReportDate(({ month, year }) => ({ month, year: year - 1 }))}>
                  <ChevronLeft size={18} aria-hidden='true' />
                </button>
                <strong aria-live='polite'>{reportYear}</strong>
                <button type='button' className='ui-icon-button' aria-label='Próximo ano' onClick={() => setReportDate(({ month, year }) => ({ month, year: year + 1 }))}>
                  <ChevronRight size={18} aria-hidden='true' />
                </button>
              </div>
              <div className='report-picker-months'>
                {MONTHS_SHORT.map((label, month) => (
                  <button
                    key={label}
                    type='button'
                    aria-label={MONTHS_FULL[month]}
                    aria-pressed={reportMonth === month}
                    onClick={() => {
                      setReportDate((previous) => ({ ...previous, month }))
                      setShowMonthYearPicker(false)
                      periodButtonRef.current?.focus()
                    }}
                  >{label}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <section className='report-stats' aria-label='Resumo do período'>
        <StatsSummaryCard title='Volume vendido' icon={<Droplets size={17} aria-hidden='true' />} value={formatLiters(reportData.totalLiters)} previous={formatLiters(previousTotals.liters)} change={litersChange} />
        <StatsSummaryCard title='Valor vendido' icon={<DollarSign size={17} aria-hidden='true' />} value={formatCurrency(reportData.totalValue)} previous={formatCurrency(previousTotals.value)} change={valueChange} />
      </section>

      <section className='report-chart' aria-labelledby='report-chart-title'>
        <header className='report-chart-heading'>
          <h2 id='report-chart-title'><BarChart3 size={20} aria-hidden='true' /> {viewMode === 'month' ? 'Vendas por mês' : 'Vendas por semana'}</h2>
          <div className='report-view-toggle' role='group' aria-label='Agrupamento de vendas'>
            <button type='button' aria-pressed={viewMode === 'month'} onClick={() => setViewMode('month')}>Mês</button>
            <button type='button' aria-pressed={viewMode === 'week'} onClick={() => setViewMode('week')}>Semana</button>
          </div>
        </header>

        {viewMode === 'month' ? (
          maxValue > 0 ? (
            <>
              <div className='report-chart-summary' aria-live='polite'>
                <span>{MONTHS_FULL[reportMonth]} de {reportYear}</span>
                <strong>{formatCurrency(reportData.totalValue)}</strong>
              </div>
              <div className='report-bars' role='group' aria-label={'Vendas mensais em ' + reportYear}>
                {monthlyTotals.map(({ totalValue, totalLiters }, month) => {
                  const height = totalValue > 0 ? Math.max(3, totalValue / maxValue * 100) : 0
                  return (
                    <button
                      key={month}
                      type='button'
                      aria-pressed={reportMonth === month}
                      aria-label={MONTHS_FULL[month] + ', ' + formatCurrency(totalValue) + ', ' + formatLiters(totalLiters)}
                      onClick={() => setReportDate((date) => ({ ...date, month }))}
                    >
                      <span className='report-bar-track' aria-hidden='true'>
                        <span className='report-bar-fill' style={{ height: height + '%' }} />
                      </span>
                      <span className='report-bar-label' aria-hidden='true'>{MONTHS_SHORT[month]}</span>
                    </button>
                  )
                })}
              </div>
            </>
          ) : <p className='report-empty'>Nenhuma venda registrada em {reportYear}.</p>
        ) : reportData.weeks.length ? (
          <ul className='report-weeks'>
            {reportData.weeks.map((week) => (
              <li key={week.label}>
                <div><strong>{week.label}</strong><span>{formatLiters(week.liters)} vendidos</span></div>
                <strong>{formatCurrency(week.value)}</strong>
              </li>
            ))}
          </ul>
        ) : <p className='report-empty'>Nenhuma venda registrada em {MONTHS_FULL[reportMonth].toLocaleLowerCase('pt-BR')}.</p>}
      </section>
    </div>
  )
}
