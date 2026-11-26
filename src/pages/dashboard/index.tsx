import React, { useMemo, useState } from 'react'
import {
  ArrowRight, CalendarDays, ChevronDown, CircleDollarSign, Milk, ReceiptText, Users, Wallet
} from 'lucide-react'
import type { Client, PriceSettings, Sale } from '@/types'

type Props = {
  clients: Client[]
  sales: Sale[]
  clientBalances: Map<string, number>
  priceSettings: PriceSettings
  onShowClients: () => void
  onShowPayments: () => void
  onShowReports: (date: Date) => void
  onShowSettings: () => void
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const axisNumber = new Intl.NumberFormat('pt-BR', {
  notation: 'compact', maximumFractionDigits: 1
})
const monthFormat = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const dayFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
const monthKey = (date: Date) => date.getFullYear() * 12 + date.getMonth()
const monthStart = (key: number) => new Date(Math.floor(key / 12), key % 12, 1)
const liters = (value: number) => number.format(value) + ' L'
const periodLabel = (date: Date) => {
  const label = monthFormat.format(date)
  return label.charAt(0).toLocaleUpperCase('pt-BR') + label.slice(1)
}
const shortDay = (day: number) => String(day).padStart(2, '0')

export function DashboardPage({
  clients, sales, clientBalances, priceSettings, onShowClients, onShowPayments, onShowReports, onShowSettings
}: Props) {
  const currentMonth = monthKey(new Date())
  const [period, setPeriod] = useState(currentMonth)
  const [metric, setMetric] = useState<'liters' | 'revenue'>('liters')
  const [selectedBucket, setSelectedBucket] = useState<number | null>(null)

  const datedSales = useMemo(() => sales
    .map((sale) => ({ sale, date: new Date(sale.date) }))
    .filter(({ date }) => Number.isFinite(date.getTime()))
    .sort((a, b) => b.date.getTime() - a.date.getTime()), [sales])
  const months = useMemo(() => Array.from(new Set([
    ...Array.from({ length: 12 }, (_, index) => currentMonth - index),
    ...datedSales.map(({ date }) => monthKey(date)),
    period
  ])).sort((a, b) => b - a), [currentMonth, datedSales, period])
  const clientNames = useMemo(() => new Map<string, string>(clients.map((client) => [client.id, client.name])), [clients])
  const balances = useMemo(() => clients
    .map((client) => ({ ...client, balance: clientBalances.get(client.id) ?? 0 }))
    .filter(({ balance }) => balance > 0)
    .sort((a, b) => b.balance - a.balance), [clients, clientBalances])
  const receivable = balances.reduce((total, client) => total + client.balance, 0)

  const { monthSales, buckets, totals } = useMemo(() => {
    const first = monthStart(period)
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
    const monthSales = datedSales.filter(({ date }) => monthKey(date) === period)
    const buckets = Array.from({ length: Math.ceil(days / 3) }, (_, index) => ({
      start: index * 3 + 1,
      end: Math.min(index * 3 + 3, days),
      liters: 0,
      revenue: 0
    }))
    const totals = { liters: 0, revenue: 0 }
    monthSales.forEach(({ sale, date }) => {
      const bucket = buckets[Math.floor((date.getDate() - 1) / 3)]
      const volume = Number(sale.liters) || 0
      const revenue = Number(sale.totalValue) || 0
      bucket.liters += volume
      bucket.revenue += revenue
      totals.liters += volume
      totals.revenue += revenue
    })
    return { monthSales, buckets, totals }
  }, [datedSales, period])

  const cards = [
    { label: 'Leite vendido', value: liters(totals.liters), note: 'Volume no período', icon: Milk },
    {
      label: 'Faturamento', value: currency.format(totals.revenue),
      note: monthSales.length === 1 ? '1 venda no período' : number.format(monthSales.length) + ' vendas no período',
      icon: CircleDollarSign
    },
    { label: 'A receber', value: currency.format(receivable), note: 'Saldo de todos os meses', icon: Wallet },
    { label: 'Clientes', value: number.format(clients.length), note: 'Total de cadastros', icon: Users }
  ]

  const formatMetric = metric === 'liters' ? liters : (value: number) => currency.format(value)
  const max = Math.max(0, ...buckets.map((bucket) => bucket[metric]))
  const magnitude = max > 0 ? 10 ** Math.floor(Math.log10(max)) : 1
  const ceiling = max > 0 ? Math.ceil(max / magnitude) * magnitude : 0
  const selected = selectedBucket === null ? null : buckets[selectedBucket]
  const rangeLabel = (bucket: typeof buckets[number]) =>
    bucket.start === bucket.end ? 'Dia ' + shortDay(bucket.start) : 'Dias ' + shortDay(bucket.start) + ' a ' + shortDay(bucket.end)

  return (
    <div className='overview'>
      <header className='overview-header'>
        <div>
          <h1>Visão geral</h1>
          <p>Acompanhe as vendas de leite e os recebimentos da fazenda.</p>
        </div>
        <label className='overview-period'>
          <CalendarDays size={17} aria-hidden='true' />
          <select
            aria-label='Mês do painel'
            name='periodo'
            value={period}
            onChange={(event) => {
              setPeriod(Number(event.target.value))
              setSelectedBucket(null)
            }}
          >
            {months.map((month) => <option key={month} value={month}>{periodLabel(monthStart(month))}</option>)}
          </select>
          <ChevronDown size={15} aria-hidden='true' />
        </label>
      </header>

      <dl className='overview-metrics' aria-label='Indicadores'>
        {cards.map(({ label, value, note, icon: Icon }) => (
          <div key={label} className='overview-metric'>
            <dt><span><Icon size={17} strokeWidth={1.8} aria-hidden='true' /></span>{label}</dt>
            <dd>{value}</dd>
            <dd className='overview-metric-note'>{note}</dd>
          </div>
        ))}
      </dl>

      <div className='overview-grid'>
        <div className='overview-main-column'>
          <section className='overview-panel overview-chart' aria-labelledby='overview-chart-title'>
            <div className='overview-panel-heading'>
              <div>
                <h2 id='overview-chart-title'>Evolução das vendas</h2>
                <p>Vendas agrupadas a cada três dias</p>
              </div>
              <div className='overview-toggle' role='group' aria-label='Indicador do gráfico'>
                <button type='button' aria-pressed={metric === 'liters'} onClick={() => setMetric('liters')}>Litros</button>
                <button type='button' aria-pressed={metric === 'revenue'} onClick={() => setMetric('revenue')}>Faturamento</button>
              </div>
            </div>
            <div className='overview-chart-reading'>
              <strong>{formatMetric(totals[metric])}</strong>
              <span>{monthFormat.format(monthStart(period))}</span>
            </div>

            {max > 0 ? (
              <>
                <div className='overview-plot'>
                  <div className='overview-axis' aria-hidden='true'>
                    <span>{axisNumber.format(ceiling)}</span>
                    <span>{axisNumber.format(ceiling / 2)}</span>
                    <span>0</span>
                  </div>
                  <div className='overview-bars' role='group' aria-label='Intervalos de vendas'>
                    {buckets.map((bucket, index) => (
                      <button
                        key={bucket.start}
                        className='overview-bar'
                        type='button'
                        aria-label={rangeLabel(bucket) + ', ' + formatMetric(bucket[metric])}
                        aria-pressed={selectedBucket === index}
                        onClick={() => setSelectedBucket(selectedBucket === index ? null : index)}
                      >
                        <span className='overview-bar-track' aria-hidden='true'>
                          <span
                            className={bucket[metric] > 0 ? 'overview-bar-fill' : 'overview-bar-zero'}
                            style={{ height: Math.max(0, bucket[metric] / ceiling) * 100 + '%' }}
                          />
                        </span>
                        <span className='overview-axis-day' aria-hidden='true'>{shortDay(bucket.start)}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <p className='overview-chart-caption' aria-live='polite'>
                  {selected ? rangeLabel(selected) + ' · ' + formatMetric(selected[metric]) : 'Selecione uma barra para consultar o valor do intervalo.'}
                </p>
              </>
            ) : (
              <div className='overview-chart-empty'>
                <ReceiptText size={24} aria-hidden='true' />
                <p>{monthSales.length ? 'Sem valores para este indicador no período.' : 'Nenhuma venda registrada no período.'}</p>
              </div>
            )}
          </section>

          <section className='overview-panel overview-sales' aria-labelledby='overview-sales-title'>
            <div className='overview-panel-heading'>
              <div>
                <h2 id='overview-sales-title'>Vendas recentes</h2>
                <p>Últimos registros do período</p>
              </div>
              <button type='button' className='overview-outline' onClick={() => onShowReports(monthStart(period))}>
                Relatórios <ArrowRight size={15} aria-hidden='true' />
              </button>
            </div>
            {monthSales.length ? (
              <table className='overview-table'>
                <thead>
                  <tr>
                    <th scope='col'>Cliente</th>
                    <th scope='col' className='overview-desktop-cell'>Data</th>
                    <th scope='col' className='overview-desktop-cell overview-number-cell'>Volume</th>
                    <th scope='col' className='overview-number-cell'>Valor</th>
                    <th scope='col' className='overview-desktop-cell'>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {monthSales.slice(0, 5).map(({ sale, date }) => {
                    const name: string = clientNames.get(sale.clientId) || 'Cliente'
                    const paid = sale.isPaid || sale.paymentStatus === 'AVISTA'
                    return (
                      <tr key={sale.id}>
                        <th scope='row'>
                          <div className='overview-client-cell'>
                            <span className='overview-avatar' aria-hidden='true'>{Array.from(name.trim())[0]?.toLocaleUpperCase('pt-BR') || '?'}</span>
                            <div>
                              <span className='overview-client-name'>{name}</span>
                              <span className='overview-mobile-cell'>{dayFormat.format(date)} · {liters(sale.liters)}</span>
                            </div>
                          </div>
                        </th>
                        <td className='overview-desktop-cell'><time dateTime={date.toISOString()}>{dayFormat.format(date)}</time></td>
                        <td className='overview-desktop-cell overview-number-cell'>{liters(sale.liters)}</td>
                        <td className='overview-number-cell'>
                          <strong>{currency.format(sale.totalValue)}</strong>
                          <span className='overview-mobile-cell'><SaleBadge paid={paid} /></span>
                        </td>
                        <td className='overview-desktop-cell'><SaleBadge paid={paid} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className='overview-list-empty'>
                <p>Nenhuma venda neste mês.</p>
                <button type='button' className='overview-text-action' onClick={onShowClients}>Ver clientes <ArrowRight size={15} aria-hidden='true' /></button>
              </div>
            )}
          </section>
        </div>

        <aside className='overview-side-column' aria-label='Preços e saldos'>
          <section className='overview-panel overview-pricing' aria-labelledby='overview-pricing-title'>
            <div className='overview-price-heading'>
              <Milk size={20} aria-hidden='true' />
              <h2 id='overview-pricing-title'>Preço do leite</h2>
            </div>
            <p className='overview-price-value'>{currency.format(priceSettings.standard)} <span>/ L</span></p>
            <p className='overview-price-note'>Preço padrão por litro</p>
            <div className='overview-price-footer'>
              <span>Personalizado</span>
              <strong>{currency.format(priceSettings.custom)} / L</strong>
            </div>
            <button type='button' onClick={onShowSettings}>
              Ajustar preços <ArrowRight size={15} aria-hidden='true' />
            </button>
          </section>

          <section className='overview-panel overview-balances' aria-labelledby='overview-balances-title'>
            <div className='overview-panel-heading'>
              <div>
                <h2 id='overview-balances-title'>Saldos em aberto</h2>
                <p>Maiores valores a receber</p>
              </div>
            </div>
            {balances.length ? (
              <ul>
                {balances.slice(0, 3).map((client) => (
                  <li key={client.id}>
                    <span>{client.name}</span>
                    <strong>{currency.format(client.balance)}</strong>
                  </li>
                ))}
              </ul>
            ) : <p className='overview-balances-empty'>Nenhum cliente com saldo em aberto.</p>}
            <button type='button' className='overview-text-action' onClick={onShowPayments}>
              Ver pagamentos <ArrowRight size={15} aria-hidden='true' />
            </button>
          </section>
        </aside>
      </div>
    </div>
  )
}

function SaleBadge({ paid }: { paid: boolean }) {
  return <span className={'overview-badge ' + (paid ? 'overview-badge-paid' : 'overview-badge-due')}>{paid ? 'Pago' : 'A prazo'}</span>
}
