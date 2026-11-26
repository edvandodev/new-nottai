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
  Users,
  X
} from 'lucide-react'
import type { Client, Payment, Sale } from '@/types'
import '../../styles/theme-flat.css'

type ReportsPageProps = {
  sales: Sale[]
  payments: Payment[]
  clients: Client[]
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

const getTopClientsByMonth = (
  sales: Sale[],
  clients: Client[],
  year: number,
  monthIndex: number,
  topN = 3
) => {
  const filtered = filterSalesByMonth(sales, year, monthIndex)
  const nameById = new Map(clients.map((c) => [c.id, c.name]))
  const avatarById = new Map(clients.map((c) => [c.id, c.avatar]))

  const aggregated = new Map<
    string,
    { clientId: string; name: string; avatar?: string; totalValue: number; totalLiters: number }
  >()

  filtered.forEach((s) => {
    const clientId = s.clientId || 'desconhecido'
    const current =
      aggregated.get(clientId) || {
        clientId,
        name: nameById.get(clientId) || 'Cliente',
        avatar: avatarById.get(clientId),
        totalValue: 0,
        totalLiters: 0
      }
    current.totalValue += s.totalValue
    current.totalLiters += s.liters
    if (!current.avatar) current.avatar = avatarById.get(clientId)
    aggregated.set(clientId, current)
  })

  return Array.from(aggregated.values())
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, topN)
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
  tone?: 'neutral' | 'accent'
  mainValue: string
  previousValue: string
  change: { direction: ChangeDirection; percent: number }
}

type ViewMode = 'month' | 'week'

const MonthYearToggle = ({
  monthLabel,
  yearLabel,
  onPrevMonth,
  onNextMonth,
  onPressCenter
}: {
  monthLabel: string
  yearLabel: string
  onPrevMonth: () => void
  onNextMonth: () => void
  onPressCenter: () => void
}) => (
  <div className='inline-flex items-center gap-2'>
    <button
      type='button'
      onClick={onPrevMonth}
      aria-label='Mês anterior'
      className='h-8 w-8 rounded-full flex items-center justify-center border transition-colors hover:brightness-110'
      style={{
        borderColor: 'var(--border)',
        background: 'var(--surface-2)',
        color: 'var(--muted)'
      }}
    >
      <ChevronLeft size={16} />
    </button>
    <div
      className='flex items-center gap-1.5 text-sm font-semibold'
      style={{ color: 'var(--text)' }}
    >
      <button
        type='button'
        onClick={onPressCenter}
        className='transition-colors hover:brightness-110'
        aria-label='Selecionar mês e ano'
        style={{ color: 'var(--text)' }}
      >
        {monthLabel}
      </button>
      <span style={{ color: 'var(--muted)' }}>/</span>
      <button
        type='button'
        onClick={onPressCenter}
        className='transition-colors hover:brightness-110'
        aria-label='Selecionar mês e ano'
        style={{ color: 'var(--text)' }}
      >
        {yearLabel}
      </button>
    </div>
    <button
      type='button'
      onClick={onNextMonth}
      aria-label='Próximo mês'
      className='h-8 w-8 rounded-full flex items-center justify-center border transition-colors hover:brightness-110'
      style={{
        borderColor: 'var(--border)',
        background: 'var(--surface-2)',
        color: 'var(--muted)'
      }}
    >
      <ChevronRight size={16} />
    </button>
  </div>
)

const ViewToggle = ({
  value,
  onChange
}: {
  value: ViewMode
  onChange: (v: ViewMode) => void
}) => {
  const optionClasses = (mode: ViewMode) =>
    [
      'px-3 py-1 rounded-full text-[11px] font-semibold transition-colors',
      value === mode ? '' : 'hover:brightness-110'
    ].join(' ')
  const activeStyle = {
    background: 'var(--accent)',
    color: 'var(--accent-ink)',
    boxShadow: '0 10px 22px -16px var(--shadow)'
  }
  const inactiveStyle = {
    background: 'transparent',
    color: 'var(--muted)'
  }

  return (
    <div
      className='inline-flex items-center gap-1 rounded-full border p-0.5'
      style={{
        borderColor: 'var(--border)',
        background: 'var(--surface-2)',
        boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.15)'
      }}
    >
      <button
        type='button'
        onClick={() => onChange('month')}
        className={optionClasses('month')}
        style={value === 'month' ? activeStyle : inactiveStyle}
      >
        Mês
      </button>
      <button
        type='button'
        onClick={() => onChange('week')}
        className={optionClasses('week')}
        style={value === 'week' ? activeStyle : inactiveStyle}
      >
        Semana
      </button>
    </div>
  )
}

const StatsSummaryCard = ({
  title,
  icon,
  tone = 'neutral',
  mainValue,
  previousValue,
  change
}: StatsSummaryCardProps) => {
  const isAccent = tone === 'accent'
  const cardStyle = isAccent
    ? {
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        boxShadow: '0 12px 30px -26px var(--shadow)'
      }
    : {
        background: 'var(--mint, #e6efe3)',
        borderColor: 'var(--border)',
        boxShadow: '0 12px 30px -26px var(--shadow)'
      }

  const iconStyle = isAccent
    ? {
        background: 'var(--accent-soft)',
        color: 'var(--accent)',
        borderColor: 'var(--border)'
      }
    : {
        background: 'var(--surface-2)',
        color: 'var(--accent)',
        borderColor: 'var(--border)'
      }

  const valueStyle = {
    color: 'var(--text)'
  }

  const dividerStyle = {
    background: 'var(--border)'
  }

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
      className='flat-card p-4 flex flex-col gap-3 shadow-sm overflow-hidden'
      style={cardStyle}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='space-y-1 flex-1 min-w-0'>
          <p
            className='text-xs uppercase tracking-wide font-semibold'
            style={{ color: 'var(--muted)' }}
          >
            {title}
          </p>
          <p
            className='text-lg font-extrabold whitespace-nowrap overflow-hidden text-ellipsis'
            style={valueStyle}
            title={mainValue}
          >
            {mainValue}
          </p>
        </div>
        <div
          className='h-8 w-8 rounded-full flex items-center justify-center shrink-0 border'
          style={iconStyle}
        >
          {icon}
        </div>
      </div>

      <div className='h-px w-full' style={dividerStyle} />

      <div className='space-y-1'>
        <p className='text-[11px] font-medium' style={{ color: 'var(--muted)' }}>
          Mês passado
        </p>
        <div className='flex items-center justify-between text-xs' style={{ color: 'var(--muted)' }}>
          <span
            className='font-semibold whitespace-nowrap overflow-hidden text-ellipsis'
            style={{ color: 'var(--text)' }}
          >
            {previousValue}
          </span>
          <span className={`flex items-center gap-1 font-bold ${changeColor}`}>
            {renderChangeIcon()}
            {percentLabel}
          </span>
        </div>
      </div>
    </div>
  )
}

export function ReportsPage({ sales, payments, clients }: ReportsPageProps) {
  const [reportDate, setReportDate] = useState(() => ({
    year: new Date().getFullYear(),
    month: new Date().getMonth()
  }))
  const reportYear = reportDate.year
  const reportMonth = reportDate.month
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false)
  const monthYearRef = useRef<HTMLDivElement | null>(null)
  const chartScrollRef = useRef<HTMLDivElement | null>(null)
  const [chartMetric, setChartMetric] = useState<'totalLiters' | 'totalValue'>('totalLiters')

  const goPrevMonth = () => {
    setShowMonthYearPicker(false)
    setReportDate((prev) => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 }
      }
      return { year: prev.year, month: prev.month - 1 }
    })
  }

  const goNextMonth = () => {
    setShowMonthYearPicker(false)
    setReportDate((prev) => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 }
      }
      return { year: prev.year, month: prev.month + 1 }
    })
  }

  useEffect(() => {
    if (!showMonthYearPicker) return
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!monthYearRef.current || !target) return
      if (!monthYearRef.current.contains(target)) {
        setShowMonthYearPicker(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
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

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

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

  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [isRankingOpen, setIsRankingOpen] = useState(false)

  const monthlyTotals = useMemo(
    () => getMonthlyTotals(mergedSales, reportYear),
    [mergedSales, reportYear]
  )
  const hasMonthlyData = monthlyTotals.some((month) => month.totalLiters || month.totalValue)
  const chartMax = Math.max(...monthlyTotals.map((month) => month[chartMetric]), 1)
  const selectedMonth = monthlyTotals[reportMonth]
  const formatMetric = (value: number) =>
    chartMetric === 'totalLiters' ? `${value.toLocaleString('pt-BR')} L` : formatCurrency(value)

  useEffect(() => {
    const chart = chartScrollRef.current
    const selected = chart?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
    if (!chart || !selected || chart.scrollWidth <= chart.clientWidth) return
    const bounds = chart.getBoundingClientRect()
    const bar = selected.getBoundingClientRect()
    if (bar.left >= bounds.left && bar.right <= bounds.right) return
    chart.scrollLeft += (bar.left + bar.right - bounds.left - bounds.right) / 2
  }, [reportMonth, reportYear, viewMode, hasMonthlyData])

  const topClients = useMemo(
    () => getTopClientsByMonth(mergedSales, clients, reportYear, reportMonth, 3),
    [clients, mergedSales, reportMonth, reportYear]
  )
  const monthlyRanking = useMemo(
    () =>
      getTopClientsByMonth(mergedSales, clients, reportYear, reportMonth, clients.length || 50).sort(
        (a, b) => b.totalValue - a.totalValue
      ),
    [clients, mergedSales, reportMonth, reportYear]
  )
  const rankingTotalValue = monthlyTotals[reportMonth]?.totalValue || 0
  const rankingTotalLiters = monthlyTotals[reportMonth]?.totalLiters || 0
  const maxRankingValue = useMemo(
    () => monthlyRanking.reduce((max, item) => Math.max(max, item.totalValue), 0),
    [monthlyRanking]
  )

  const getAvatarColors = (input: string) => {
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i)
      hash |= 0
    }
    const hue = Math.abs(hash) % 360
    return {
      bg: `hsl(${hue}, 40%, 25%)`,
      text: `hsl(${hue}, 60%, 82%)`
    }
  }

  return (
    <div className='reports-page space-y-6 animate-fade-in' style={{ color: 'var(--text)' }}>
      <div className='mt-3 flex items-start justify-between gap-4 mb-4'>
        <div>
          <h1 className='agro-page-title'>Relatórios</h1>
          <p className='mt-2 text-xs' style={{ color: 'var(--muted)' }}>
            Volume de leite vendido, faturamento e clientes
          </p>
        </div>
      </div>
      <div className='space-y-3'>
        <div className='flex items-center justify-between gap-4'>
          <div className='flex items-center gap-2'>
            <CalendarDays size={16} style={{ color: 'var(--muted)' }} />
            <h3
              className='text-xs font-semibold uppercase tracking-wider'
              style={{ color: 'var(--muted)' }}
            >
              Resumo do período
            </h3>
          </div>
          <div className='relative' ref={monthYearRef}>
            <MonthYearToggle
              monthLabel={MONTHS_SHORT[reportMonth]}
              yearLabel={String(reportYear)}
              onPrevMonth={goPrevMonth}
              onNextMonth={goNextMonth}
              onPressCenter={() => setShowMonthYearPicker((prev) => !prev)}
            />
            {showMonthYearPicker && (
              <div
                className='absolute right-0 mt-2 flat-card p-3 z-30 w-64'
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                  boxShadow: '0 18px 40px -30px var(--shadow)'
                }}
              >
                <div className='flex items-center justify-between mb-2 px-1'>
                  <button
                    type='button'
                    onClick={() => setReportDate((prev) => ({ ...prev, year: prev.year - 1 }))}
                    className='h-7 w-7 rounded-full flex items-center justify-center border transition-colors hover:brightness-110'
                    style={{
                      borderColor: 'var(--border)',
                      background: 'var(--surface-2)',
                      color: 'var(--muted)'
                    }}
                    aria-label='Ano anterior'
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className='text-sm font-semibold' style={{ color: 'var(--text)' }}>
                    {reportYear}
                  </span>
                  <button
                    type='button'
                    onClick={() => setReportDate((prev) => ({ ...prev, year: prev.year + 1 }))}
                    className='h-7 w-7 rounded-full flex items-center justify-center border transition-colors hover:brightness-110'
                    style={{
                      borderColor: 'var(--border)',
                      background: 'var(--surface-2)',
                      color: 'var(--muted)'
                    }}
                    aria-label='Próximo ano'
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className='grid grid-cols-3 gap-2'>
                  {MONTHS_SHORT.map((label, idx) => (
                    <button
                      key={label}
                      type='button'
                      onClick={() => {
                        setReportDate((prev) => ({ ...prev, month: idx }))
                        setShowMonthYearPicker(false)
                      }}
                      className='rounded-lg py-2 text-xs font-semibold transition border'
                      style={
                        idx === reportMonth
                          ? {
                              background: 'var(--accent)',
                              color: 'var(--accent-ink)',
                              borderColor: 'var(--accent)'
                            }
                          : {
                              background: 'var(--surface-2)',
                              color: 'var(--text)',
                              borderColor: 'var(--border)'
                            }
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>


      </div>
      <div>
        <div className='flex items-center justify-between gap-3 mb-4'>
          <div className='flex items-center gap-2'>
            <BarChart3 size={18} style={{ color: 'var(--muted)' }} />
            <h3
              className='text-base font-bold'
            >
              {viewMode === 'month' ? 'Histórico mensal' : 'Vendas por semana'}
            </h3>
          </div>
          <ViewToggle value={viewMode} onChange={setViewMode} />
        </div>

        {viewMode === 'month' ? (
          <section className='report-chart' aria-label='Histórico mensal de vendas'>
            <div className='report-chart-heading'>
              <div className='min-w-0'>
                <p className='report-chart-period'>{MONTHS_FULL[reportMonth]} de {reportYear}</p>
                <p className='report-chart-total'>{formatMetric(selectedMonth[chartMetric])}</p>
                <p className='report-chart-period'>
                  {chartMetric === 'totalLiters'
                    ? `Faturamento de ${formatCurrency(selectedMonth.totalValue)}`
                    : `${selectedMonth.totalLiters.toLocaleString('pt-BR')} L vendidos`}
                </p>
              </div>
              <div className='report-metrics' role='group' aria-label='Medida do gráfico'>
                <button type='button' aria-pressed={chartMetric === 'totalLiters'} onClick={() => setChartMetric('totalLiters')}>Litros</button>
                <button type='button' aria-pressed={chartMetric === 'totalValue'} onClick={() => setChartMetric('totalValue')}>R$</button>
              </div>
            </div>
            {hasMonthlyData ? (
              <div className='report-chart-scroll' ref={chartScrollRef}>
                <div className='report-chart-grid'>
                  {monthlyTotals.map((entry, month) => (
                    <button
                      key={month}
                      type='button'
                      className='report-chart-month'
                      aria-pressed={month === reportMonth}
                      aria-label={`${MONTHS_FULL[month]}, ${formatMetric(entry[chartMetric])}`}
                      title={`${MONTHS_FULL[month]} · ${formatMetric(entry[chartMetric])}`}
                      onClick={() => setReportDate((prev) => ({ ...prev, month }))}
                    >
                      <span className='report-chart-track' aria-hidden='true'>
                        <span style={{ height: `${Math.max(0, entry[chartMetric]) / chartMax * 100}%` }} />
                      </span>
                      <span>{MONTHS_SHORT[month]}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className='agro-empty'>Nenhuma venda registrada em {reportYear}.</p>
            )}
          </section>
        ) : reportData.weeks.length === 0 ? (
          <div
            className='flat-card p-8 text-center'
            style={{ borderStyle: 'dashed', borderColor: 'var(--border)' }}
          >
            <p className='text-sm' style={{ color: 'var(--muted)' }}>
              Nenhuma venda registrada neste período.
            </p>
          </div>
        ) : (
          <div className='space-y-3'>
            {reportData.weeks.map((week, idx) => (
              <div
                key={idx}
                className='flat-card p-4 flex justify-between items-center'
              >
                <div className='flex flex-col'>
                  <span className='text-sm font-semibold' style={{ color: 'var(--text)' }}>
                    {week.label}
                  </span>
                  <span className='text-xs mt-0.5' style={{ color: 'var(--muted)' }}>
                    {week.liters}{' '}
                    {week.liters === 1 ? 'Litro vendido' : 'Litros vendidos'}
                  </span>
                </div>
                <div className='flat-pill px-3 py-1'>
                  <span className='font-semibold' style={{ color: 'var(--accent)' }}>
                    {formatCurrency(week.value)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <StatsSummaryCard
          title='Leite vendido'
          icon={<Droplets size={12} />}
          tone='neutral'
          mainValue={`${reportData.totalLiters} L`}
          previousValue={`${previousTotals.liters} L`}
          change={litersChange}
        />
        <StatsSummaryCard
          title='Faturamento'
          icon={<DollarSign size={12} />}
          tone='accent'
          mainValue={formatCurrency(reportData.totalValue)}
          previousValue={formatCurrency(previousTotals.value)}
          change={valueChange}
        />
      </div>

      <div className='space-y-3'>
        <div className='flex items-center gap-2'>
          <Users size={16} style={{ color: 'var(--muted)' }} />
          <h3
            className='text-xs font-semibold uppercase tracking-wider'
            style={{ color: 'var(--muted)' }}
          >
            TOP CLIENTES ({MONTHS_FULL[reportMonth].toUpperCase()})
          </h3>
          {monthlyRanking.length > 0 && (
            <span
              role='button'
              tabIndex={0}
              onClick={() => setIsRankingOpen(true)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsRankingOpen(true)}
              className='ml-auto text-xs font-semibold cursor-pointer inline-flex items-center gap-1'
              style={{ color: 'var(--accent)' }}
            >
              VER TODOS
              <ChevronRight size={18} strokeWidth={3} />
            </span>
          )}
        </div>

        {topClients.length === 0 ? (
          <div
            className='flat-card px-4 py-6 text-center text-sm'
            style={{ borderStyle: 'dashed', borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
            Nenhuma venda registrada neste período.
          </div>
        ) : (
            <div className='flex gap-3 overflow-x-auto no-scrollbar pb-1'>
              {topClients.map((client, idx) => {
                const initials = client.name
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase() || '')
                  .join('')
                const colors = getAvatarColors(client.clientId || client.name)
                const isLeader = idx === 0
                const cardStyle = isLeader
                  ? {
                      background:
                        'linear-gradient(160deg, #e6f0e4 0%, #ffffff 70%)',
                      borderColor: 'rgba(51, 104, 77, 0.22)',
                      boxShadow: '0 16px 30px -24px rgba(51, 104, 77, 0.22)'
                    }
                  : {
                      background: 'var(--surface)',
                      borderColor: 'var(--border)'
                    }
                const badgeStyle = isLeader
                  ? {
                      background: 'rgba(51, 104, 77, 0.10)',
                      color: 'var(--accent)',
                      borderColor: 'rgba(51, 104, 77, 0.22)'
                    }
                  : {
                      background: 'var(--surface-2)',
                      color: 'var(--text)',
                      borderColor: 'var(--border)'
                    }

                return (
                  <div
                    key={client.clientId + idx}
                    className='flat-card relative min-w-[200px] p-3 flex-1 shadow-sm border'
                    style={cardStyle}
                  >
                    <span
                      className='absolute top-2 right-2 text-[10px] font-extrabold rounded-full px-2 py-0.5 border'
                      style={badgeStyle}
                    >
                      #{idx + 1}
                    </span>
                    <div className='flex items-center gap-3'>
                      <div
                        className='h-11 w-11 rounded-full border flex items-center justify-center shrink-0 overflow-hidden'
                        style={{
                          backgroundColor: colors.bg,
                          color: colors.text,
                          borderColor: 'var(--border)'
                        }}
                      >
                        {client.avatar ? (
                          <img
                            src={client.avatar}
                            alt={client.name}
                            className='h-full w-full object-cover'
                          />
                        ) : (
                          <span className='text-sm font-bold'>{initials}</span>
                        )}
                      </div>
                      <div className='space-y-1 min-w-0'>
                        <p
                          className='text-sm font-semibold truncate'
                          style={{ color: 'var(--text)' }}
                          title={client.name}
                        >
                          {client.name}
                        </p>
                        <p
                          className='text-sm font-semibold'
                          style={{ color: isLeader ? 'var(--accent)' : 'var(--text)' }}
                        >
                          {formatCurrency(client.totalValue)}
                        </p>
                        <p className='text-xs' style={{ color: 'var(--muted)' }}>
                          {client.totalLiters.toLocaleString('pt-BR')} L
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {isRankingOpen && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center px-4'
          style={{ background: 'rgba(2, 6, 23, 0.72)' }}
        >
          <div
            className='w-full max-w-lg rounded-3xl border overflow-hidden'
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              boxShadow: '0 30px 60px -40px var(--shadow)'
            }}
          >
            <div
              className='flex items-center justify-between px-5 py-4 border-b'
              style={{
                borderColor: 'var(--border)',
                background:
                  'linear-gradient(180deg, #ffffff 0%, #f1f6ef 100%)'
              }}
            >
              <div className='flex flex-col gap-1'>
                <div className='flex items-center gap-2'>
                  <Users size={16} style={{ color: 'var(--muted)' }} />
                  <h3 className='text-sm font-semibold' style={{ color: 'var(--text)' }}>
                    Ranking de clientes
                  </h3>
                </div>
                <div className='flex items-center gap-2 text-xs' style={{ color: 'var(--muted)' }}>
                  <span>{MONTHS_FULL[reportMonth]}</span>
                  <span>•</span>
                  <span>por valor (R$)</span>
                </div>
              </div>
              <button
                type='button'
                onClick={() => setIsRankingOpen(false)}
                className='h-9 w-9 rounded-full flex items-center justify-center border transition-colors hover:brightness-110'
                style={{
                  borderColor: 'var(--border)',
                  background: 'var(--surface-2)',
                  color: 'var(--muted)'
                }}
                aria-label='Fechar'
              >
                <X size={18} />
              </button>
            </div>

            <div className='max-h-[70vh] overflow-y-auto custom-scrollbar p-4 space-y-3'>
              {monthlyRanking.length === 0 ? (
                <div
                  className='flat-card p-6 text-center text-sm'
                  style={{ borderStyle: 'dashed', borderColor: 'var(--border)', color: 'var(--muted)' }}
                >
                  Nenhuma venda registrada neste período.
                </div>
              ) : (
                monthlyRanking.map((client, idx) => {
                  const initials = client.name
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase() || '')
                    .join('')
                  const colors = getAvatarColors(client.clientId || client.name)
                  const isTopThree = idx < 3
                  const primaryValue = formatCurrency(client.totalValue)
                  const secondaryValue = `${client.totalLiters.toLocaleString('pt-BR')} L`
                  const sharePct =
                    rankingTotalValue > 0
                      ? Math.round((client.totalValue / rankingTotalValue) * 100)
                      : 0
                  const barWidth =
                    maxRankingValue > 0
                      ? Math.min((client.totalValue / maxRankingValue) * 100, 100)
                      : 0
                  const rowStyle = isTopThree
                    ? {
                        background: 'rgba(184, 255, 44, 0.06)',
                        borderColor: 'rgba(184, 255, 44, 0.28)'
                      }
                    : {
                        background: 'var(--surface-2)',
                        borderColor: 'var(--border)'
                      }
                  const badgeStyle = isTopThree
                    ? {
                        background: 'rgba(51, 104, 77, 0.10)',
                        color: 'var(--accent)',
                        borderColor: 'rgba(51, 104, 77, 0.22)'
                      }
                    : {
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        borderColor: 'var(--border)'
                      }

                  return (
                    <div
                      key={client.clientId + idx}
                      className='relative overflow-hidden rounded-xl border p-3'
                      style={rowStyle}
                    >
                      <div
                        className='absolute inset-y-0 left-0'
                        style={{
                          width: `${barWidth}%`,
                          background: 'rgba(184, 255, 44, 0.12)'
                        }}
                      />
                      <div className='relative z-10 flex items-center gap-3'>
                        <div
                          className='h-8 w-8 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0'
                          style={badgeStyle}
                        >
                          {idx + 1}
                        </div>
                        <div
                          className='h-9 w-9 rounded-full border flex items-center justify-center shrink-0 overflow-hidden'
                          style={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                            borderColor: 'var(--border)'
                          }}
                        >
                          {client.avatar ? (
                            <img src={client.avatar} alt={client.name} className='h-full w-full object-cover' />
                          ) : (
                            <span className='text-[11px] font-bold'>{initials}</span>
                          )}
                        </div>
                        <div className='min-w-0 flex-1'>
                          <p
                            className='text-sm font-semibold truncate'
                            style={{ color: 'var(--text)' }}
                            title={client.name}
                          >
                            {client.name}
                          </p>
                          <p className='text-xs' style={{ color: 'var(--muted)' }}>
                            {secondaryValue}
                          </p>
                        </div>
                        <div className='text-right'>
                          <p
                            className='text-sm font-semibold'
                            style={{ color: isTopThree ? 'var(--accent)' : 'var(--text)' }}
                          >
                            {primaryValue}
                          </p>
                          <p className='text-[10px]' style={{ color: 'var(--muted)' }}>
                            {sharePct > 0 ? `${sharePct}% do total` : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div
              className='border-t px-5 py-4 flex items-center justify-between'
              style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
            >
              <div className='flex items-center gap-2 text-xs font-semibold' style={{ color: 'var(--muted)' }}>
                <span>Total do mês:</span>
                <span style={{ color: 'var(--accent)' }}>
                  {formatCurrency(rankingTotalValue)}
                </span>
                <span>•</span>
                <span style={{ color: 'var(--muted)' }}>
                  {rankingTotalLiters.toLocaleString('pt-BR')} L
                </span>
              </div>
              <div className='text-xs' style={{ color: 'var(--muted)' }}>
                Clientes ativos:{' '}
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                  {monthlyRanking.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
