import React, { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  DollarSign,
  Droplets,
  Users,
  X
} from 'lucide-react'
import type { Client, Payment, Sale } from '@/types'
import { MonthYearFilterButtons } from '@/components/MonthYearFilterButtons'

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
            className={`text-lg font-extrabold ${accentText} whitespace-nowrap overflow-hidden text-ellipsis`}
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

export function ReportsPage({ sales, payments, clients }: ReportsPageProps) {
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

  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly')
  const [tooltipMonth, setTooltipMonth] = useState<number | null>(null)
  const [isRankingOpen, setIsRankingOpen] = useState(false)

  const monthlyTotals = useMemo(
    () => getMonthlyTotals(mergedSales, reportYear),
    [mergedSales, reportYear]
  )
  const hasMonthlyData = monthlyTotals.some((m) => m.totalValue > 0)

  useEffect(() => {
    if (viewMode === 'monthly') setTooltipMonth(reportMonth)
    else setTooltipMonth(null)
  }, [reportMonth, viewMode])

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
        <div className='flex items-center justify-between gap-3 mb-4'>
          <div className='flex items-center gap-2'>
            <BarChart3 size={18} className='text-slate-500' />
            <h3 className='text-slate-200 text-sm font-bold uppercase tracking-wider'>
              Vendas por Mês
            </h3>
          </div>
          <button
            type='button'
            onClick={() =>
              setViewMode((prev) => (prev === 'monthly' ? 'weekly' : 'monthly'))
            }
            className='text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-800 text-slate-200 hover:border-blue-500 hover:text-white transition-colors'
          >
            {viewMode === 'monthly' ? 'Ver por semana' : 'Ver por mes'}
          </button>
        </div>

        {viewMode === 'monthly' ? (
          hasMonthlyData ? (
            <div className='bg-slate-900/50 border border-slate-800 rounded-xl p-4'>
              <div className='flex items-center justify-between text-sm text-slate-300 mb-4'>
                <span className='font-semibold text-slate-100'>
                  {MONTHS_FULL[reportMonth]}
                </span>
                <div className='flex items-center gap-3 text-xs sm:text-sm text-slate-300'>
                  <span className='font-semibold'>
                    {formatCurrency(monthlyTotals[reportMonth]?.totalValue || 0)}
                  </span>
                  <span className='text-slate-400'>•</span>
                  <span className='font-semibold'>
                    {(monthlyTotals[reportMonth]?.totalLiters || 0).toLocaleString('pt-BR')} L
                  </span>
                </div>
              </div>
              <div className='overflow-x-auto no-scrollbar'>
                <div className='min-w-[640px]'>
                  {(() => {
                    const maxValue = Math.max(...monthlyTotals.map((m) => m.totalValue), 1)
                    return (
                      <div className='grid grid-cols-12 gap-0.5 sm:gap-1 h-48 items-end'>
                        {monthlyTotals.map((entry, idx) => {
                          const isZero = entry.totalValue === 0
                          const barHeightPct = isZero
                            ? 6
                            : Math.max((entry.totalValue / maxValue) * 100, 8)
                          const isActive = idx === reportMonth
                          return (
                            <button
                              key={idx}
                              type='button'
                              onClick={() => {
                                setReportMonth(idx)
                                setTooltipMonth(idx)
                              }}
                              className='relative flex flex-col items-center gap-2 group'
                              title={`${MONTHS_SHORT[idx]} - ${formatCurrency(entry.totalValue)}`}
                            >
                              <div className='h-32 sm:h-40 w-[42%] bg-slate-800/5 overflow-hidden flex items-end justify-center'>
                                <div
                                  className={`w-full transition-all ${
                                    isActive
                                      ? 'bg-blue-400 shadow-lg shadow-blue-900/30'
                                      : 'bg-slate-600'
                                  }`}
                                  style={{
                                    height: `${barHeightPct}%`,
                                    opacity: isZero ? 0.2 : 1
                                  }}
                                />
                              </div>
                              {tooltipMonth === idx && (
                                <div className='absolute -top-10 sm:-top-12 bg-slate-800 text-slate-100 text-xs px-2.5 py-1 rounded-lg border border-slate-700 shadow-lg whitespace-nowrap'>
                                  <span className='font-semibold'>{formatCurrency(entry.totalValue)}</span>
                                  {entry.totalLiters ? (
                                    <span className='text-slate-400 ml-2'>
                                      {entry.totalLiters.toLocaleString('pt-BR')} L
                                    </span>
                                  ) : null}
                                </div>
                              )}
                              <span
                                className={`text-[11px] font-semibold uppercase tracking-wide ${
                                  isActive ? 'text-blue-200' : 'text-slate-400'
                                }`}
                              >
                                {MONTHS_SHORT[idx]}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <div className='bg-slate-900/50 rounded-xl p-8 text-center border border-slate-800 border-dashed'>
              <p className='text-slate-500'>Nenhuma venda registrada neste periodo.</p>
            </div>
          )
        ) : reportData.weeks.length === 0 ? (
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

      <div className='space-y-3'>
        <div className='flex items-center gap-2 text-slate-200'>
          <Users size={16} className='text-slate-400' />
          <h3 className='text-sm font-semibold'>
            TOP CLIENTES ({MONTHS_FULL[reportMonth].toUpperCase()})
          </h3>
          {monthlyRanking.length > 0 && (
            <span
              role='button'
              tabIndex={0}
              onClick={() => setIsRankingOpen(true)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsRankingOpen(true)}
              className='ml-auto text-xs font-semibold text-blue-300 hover:text-blue-200 cursor-pointer inline-flex items-center gap-1'
            >
              VER MAIS
              <ChevronRight size={18} strokeWidth={3} className='text-blue-300 group-hover:text-blue-200' />
            </span>
          )}
        </div>

        {topClients.length === 0 ? (
          <div className='bg-slate-900 rounded-lg border border-slate-800 px-4 py-6 text-center text-slate-500 text-sm'>
            Nenhuma venda registrada neste periodo.
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

              const badgeStyles = [
                'bg-emerald-500/20 border-emerald-500/40 text-emerald-100',
                'bg-cyan-500/20 border-cyan-500/40 text-cyan-100',
                'bg-indigo-500/20 border-indigo-500/40 text-indigo-100'
              ]
              const cardStyles = [
                'border-emerald-500/40 bg-emerald-500/10',
                'border-cyan-500/40 bg-cyan-500/10',
                'border-indigo-500/40 bg-indigo-500/10'
              ]
              const colorIndex = Math.min(idx, 2)

              return (
                <div
                  key={client.clientId + idx}
                  className={`relative min-w-[200px] rounded-xl p-3 flex-1 shadow-sm border ${cardStyles[colorIndex]}`}
                >
                  <span
                    className={`absolute top-2 right-2 text-[10px] font-extrabold rounded-full px-2 py-0.5 ${badgeStyles[colorIndex]}`}
                  >
                    {idx + 1}
                  </span>
                  <div className='flex items-center gap-3'>
                    <div className='h-11 w-11 rounded-full bg-slate-900/40 border border-slate-600 flex items-center justify-center text-slate-100 shrink-0 overflow-hidden'>
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
                      <p className='text-white font-semibold truncate'>{client.name}</p>
                      <p className='text-sm text-slate-200 font-semibold'>
                        {formatCurrency(client.totalValue)}
                      </p>
                      <p className='text-xs text-slate-400'>
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
        <div className='fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center px-4'>
          <div className='w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden'>
            <div className='flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80'>
              <div className='flex flex-col gap-1 text-slate-200'>
                <div className='flex items-center gap-2'>
                  <Users size={16} className='text-slate-400' />
                  <h3 className='text-sm font-semibold'>Ranking de clientes</h3>
                </div>
                <div className='flex items-center gap-2 text-xs text-slate-400'>
                  <span>{MONTHS_FULL[reportMonth]}</span>
                  <span className='text-slate-600'>•</span>
                  <span>por Valor (R$)</span>
                </div>
              </div>
              <button
                type='button'
                onClick={() => setIsRankingOpen(false)}
                className='h-10 w-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors'
                aria-label='Fechar'
              >
                <X size={18} />
              </button>
            </div>

            <div className='max-h-[70vh] overflow-y-auto custom-scrollbar p-4 space-y-2'>
              {monthlyRanking.length === 0 ? (
                <div className='text-center text-slate-500 py-8'>
                  Nenhuma venda registrada neste periodo.
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

                  const rankStyles =
                    idx === 0
                      ? 'bg-emerald-500/10 border-emerald-500/40'
                      : idx === 1
                      ? 'bg-cyan-500/10 border-cyan-500/40'
                      : idx === 2
                      ? 'bg-indigo-500/10 border-indigo-500/40'
                      : 'bg-slate-800/60 border-slate-700'

                  const badgeStyles =
                    idx === 0
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-100'
                      : idx === 1
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-100'
                      : idx === 2
                      ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-100'
                      : 'bg-slate-700/60 text-slate-300'

                  const primaryValue = formatCurrency(client.totalValue)
                  const secondaryValue = `${client.totalLiters.toLocaleString('pt-BR')} L`

                  return (
                    <React.Fragment key={client.clientId + idx}>
                      <div className={`flex items-start gap-3 py-3 px-3 rounded-xl border ${rankStyles}`}>
                        <span
                          className={`text-xs font-extrabold rounded-full px-2 py-0.5 w-8 text-center mt-1 border ${badgeStyles}`}
                        >
                          {idx + 1}
                        </span>
                        <div
                          className='h-10 w-10 rounded-full border border-slate-700 flex items-center justify-center text-slate-100 shrink-0 overflow-hidden'
                          style={{ backgroundColor: colors.bg, color: colors.text }}
                        >
                          {client.avatar ? (
                            <img src={client.avatar} alt={client.name} className='h-full w-full object-cover' />
                          ) : (
                            <span className='text-xs font-bold'>{initials}</span>
                          )}
                        </div>
                        <div className='min-w-0 flex-1 space-y-1'>
                          <p className='text-white font-semibold truncate'>{client.name}</p>
                          <div className='flex items-center gap-2 text-sm text-slate-200 font-semibold'>
                            <span>{primaryValue}</span>
                            <span className='text-slate-500'>•</span>
                            <span className='text-xs text-slate-400'>{secondaryValue}</span>
                          </div>
                        </div>
                        {idx === 0 && <span className='text-lg mr-1' role='img' aria-label='Top 1'>🏆</span>}
                      </div>
                      {idx !== monthlyRanking.length - 1 && <div className='h-px bg-slate-800 my-1' />}
                    </React.Fragment>
                  )
                })
              )}
            </div>

            <div className='border-t border-slate-800 px-4 py-3 text-sm text-slate-200 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <span className='font-semibold'>Total do mês:</span>
                <span className='text-white font-bold'>
                  {formatCurrency(monthlyTotals[reportMonth]?.totalValue || 0)}
                </span>
                <span className='text-slate-500'>•</span>
                <span className='text-slate-300'>
                  {(monthlyTotals[reportMonth]?.totalLiters || 0).toLocaleString('pt-BR')} L
                </span>
              </div>
              <div className='text-xs text-slate-400'>
                Clientes ativos: <span className='text-slate-200 font-semibold'>{monthlyRanking.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}




