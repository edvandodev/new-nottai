import React, { useMemo } from 'react'
import { ArrowRight, BarChart3, Milk, Users, Wallet } from 'lucide-react'
import type { Client, Sale } from '@/types'

type DashboardPageProps = {
  clients: Client[]
  sales: Sale[]
  clientBalances: Map<string, number>
  userName?: string
  onShowClients: () => void
  onShowPayments: () => void
  onShowReports: () => void
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)

const formatLiters = (value: number) =>
  `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)} L`

const formatSaleDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data indisponível'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short'
  }).format(date)
}

export function DashboardPage({
  clients,
  sales,
  clientBalances,
  userName,
  onShowClients,
  onShowPayments,
  onShowReports
}: DashboardPageProps) {
  const monthSummary = useMemo(() => {
    const now = new Date()
    const currentMonth = sales.filter((sale) => {
      const date = new Date(sale.date)
      return (
        !Number.isNaN(date.getTime()) &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      )
    })

    return {
      liters: currentMonth.reduce((total, sale) => total + (Number(sale.liters) || 0), 0),
      revenue: currentMonth.reduce(
        (total, sale) => total + (Number(sale.totalValue) || 0),
        0
      ),
      count: currentMonth.length
    }
  }, [sales])

  const receivable = useMemo(
    () =>
      Array.from(clientBalances.values()).reduce(
        (total, balance) => total + Math.max(0, balance),
        0
      ),
    [clientBalances]
  )

  const recentSales = useMemo(
    () =>
      [...sales]
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
        .slice(0, 5),
    [sales]
  )

  const clientNames = useMemo(
    () => new Map(clients.map((client) => [client.id, client.name])),
    [clients]
  )

  const monthLabel = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric'
  }).format(new Date())
  const greetingName = userName?.trim()
    ? userName.split(/[._-]/)[0]
    : 'produtor'

  return (
    <div className='dashboard-page mx-auto max-w-2xl animate-fade-in'>
      <header className='mb-6 flex items-start justify-between gap-4'>
        <div>
          <p className='dashboard-kicker'>NOTTAÍ · GESTÃO DO LEITE</p>
          <h1 className='mt-1 text-[27px] font-bold leading-tight tracking-tight'>
            Olá, {greetingName}
          </h1>
          <p className='mt-1 text-sm' style={{ color: 'var(--muted)' }}>
            Acompanhe o movimento da fazenda
          </p>
        </div>
        <div
          className='flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl'
          style={{ color: 'var(--accent)', background: 'var(--accent-soft)' }}
        >
          <Milk size={21} />
        </div>
      </header>

      <section className='dashboard-hero'>
        <div className='relative z-10 flex items-center justify-between gap-3'>
          <div
            className='flex items-center gap-2 text-sm font-semibold'
            style={{ color: 'rgba(255,255,255,.8)' }}
          >
            <Milk size={17} />
            Leite vendido neste mês
          </div>
          <span
            className='rounded-full px-3 py-1 text-[11px] font-semibold capitalize'
            style={{
              background: 'rgba(255,255,255,.12)',
              color: 'rgba(255,255,255,.86)'
            }}
          >
            {monthLabel}
          </span>
        </div>

        <p className='relative z-10 mt-7 text-[40px] font-bold leading-none tracking-tight text-white'>
          {formatLiters(monthSummary.liters)}
        </p>

        <div className='relative z-10 mt-5 flex items-end justify-between gap-4'>
          <div>
            <p className='text-xs' style={{ color: 'rgba(255,255,255,.7)' }}>
              Valor registrado
            </p>
            <p className='mt-1 text-lg font-semibold text-white'>
              {formatCurrency(monthSummary.revenue)}
            </p>
          </div>
          <button
            onClick={onShowReports}
            className='flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-white'
            style={{ background: 'rgba(255,255,255,.14)' }}
          >
            Ver relatório <ArrowRight size={14} />
          </button>
        </div>
      </section>

      <section className='mt-4 grid grid-cols-2 gap-3'>
        <button
          onClick={onShowPayments}
          className='dashboard-mint p-4 text-left transition-transform active:scale-[.98]'
        >
          <span
            className='flex h-9 w-9 items-center justify-center rounded-xl'
            style={{ background: 'rgba(36,75,45,.09)', color: 'var(--accent)' }}
          >
            <Wallet size={18} />
          </span>
          <span className='mt-3 block text-xs font-semibold' style={{ color: 'var(--muted)' }}>
            A receber
          </span>
          <span
            className='mt-1 block text-[20px] font-bold leading-tight'
            style={{ color: 'var(--text)' }}
          >
            {formatCurrency(receivable)}
          </span>
          <span className='mt-1 block text-[11px]' style={{ color: 'var(--muted)' }}>
            Saldo em aberto
          </span>
        </button>

        <button
          onClick={onShowClients}
          className='dashboard-surface p-4 text-left transition-transform active:scale-[.98]'
        >
          <span
            className='flex h-9 w-9 items-center justify-center rounded-xl'
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            <Users size={18} />
          </span>
          <span className='mt-3 block text-xs font-semibold' style={{ color: 'var(--muted)' }}>
            Clientes
          </span>
          <span
            className='mt-1 block text-[20px] font-bold leading-tight'
            style={{ color: 'var(--text)' }}
          >
            {clients.length}
          </span>
          <span className='mt-1 block text-[11px]' style={{ color: 'var(--muted)' }}>
            Cadastros ativos
          </span>
        </button>
      </section>

      <section className='mt-7'>
        <div className='mb-3 flex items-end justify-between gap-3'>
          <div>
            <h2 className='text-lg font-bold'>Vendas recentes</h2>
            <p className='mt-0.5 text-xs' style={{ color: 'var(--muted)' }}>
              {monthSummary.count} vendas em {monthLabel}
            </p>
          </div>
          <button
            onClick={onShowReports}
            className='text-xs font-semibold'
            style={{ color: 'var(--accent)' }}
          >
            Ver relatório
          </button>
        </div>

        <div className='dashboard-surface overflow-hidden px-4'>
          {recentSales.length ? (
            recentSales.map((sale) => (
              <div
                key={sale.id}
                className='dashboard-sale-row flex items-center gap-3 py-3.5'
              >
                <span
                  className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full'
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                  <Milk size={17} />
                </span>
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-semibold'>
                    {clientNames.get(sale.clientId) || 'Cliente'}
                  </p>
                  <p className='mt-0.5 text-xs' style={{ color: 'var(--muted)' }}>
                    {formatSaleDate(sale.date)} · {formatLiters(sale.liters)}
                  </p>
                </div>
                <div className='text-right'>
                  <p className='text-sm font-bold'>{formatCurrency(sale.totalValue)}</p>
                  <p
                    className='mt-0.5 text-[10px] font-medium'
                    style={{
                      color:
                        sale.isPaid || sale.paymentStatus === 'AVISTA'
                          ? '#527d57'
                          : '#9b6b0c'
                    }}
                  >
                    {sale.isPaid || sale.paymentStatus === 'AVISTA' ? 'Pago' : 'A prazo'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className='py-8 text-center'>
              <span
                className='mx-auto flex h-11 w-11 items-center justify-center rounded-full'
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                <BarChart3 size={20} />
              </span>
              <p className='mt-3 text-sm font-semibold'>Suas vendas aparecerão aqui</p>
              <p className='mt-1 text-xs' style={{ color: 'var(--muted)' }}>
                Comece pelo cadastro de clientes para registrar uma venda.
              </p>
            </div>
          )}
        </div>
      </section>

      <div className='mt-4 grid grid-cols-2 gap-3'>
        <button
          className='dashboard-nav-button flex items-center justify-center gap-2 px-3 text-xs'
          onClick={onShowClients}
        >
          Abrir clientes <ArrowRight size={15} />
        </button>
        <button
          className='dashboard-nav-button flex items-center justify-center gap-2 px-3 text-xs'
          onClick={onShowPayments}
        >
          Pagamentos <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}
