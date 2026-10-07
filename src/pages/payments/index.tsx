import React, { useEffect, useMemo, useState } from 'react'
import { ChevronRight, FileText, Plus, Search, Trash2, Users, Wallet, X } from 'lucide-react'
import type { Client, Payment, Sale } from '@/types'
import { PageBrandHeader } from '@/components/common/PageBrandHeader'
import { FilterChips } from '@/components/payments/FilterChips'
import { PaymentRow } from '@/components/payments/PaymentRow'
import { IconButton } from '@/components/common/IconButton'
import '../../styles/theme-flat.css'

const parseDate = (
  value:
    | string
    | number
    | Date
    | { seconds?: number; nanoseconds?: number; toMillis?: () => number }
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
  if (typeof value === 'object') {
    if (typeof value.toMillis === 'function') {
      const ms = value.toMillis()
      const d = new Date(ms)
      return Number.isNaN(d.getTime()) ? null : d
    }
    if (typeof value.seconds === 'number') {
      const ms =
        value.seconds * 1000 +
        (typeof value.nanoseconds === 'number'
          ? Math.floor(value.nanoseconds / 1_000_000)
          : 0)
      const d = new Date(ms)
      return Number.isNaN(d.getTime()) ? null : d
    }
  }
  return null
}

const normalizeTs = (value: Payment['date']) => {
  const d = parseDate(value as any)
  return d ? d.getTime() : 0
}

const startOfDay = (dt: Date) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime()

const formatDayWithTime = (ts: number) => {
  if (!ts) return 'Data indispon\u00edvel'
  const d = new Date(ts)
  const now = new Date()
  const today = startOfDay(now)
  const target = startOfDay(d)
  const diff = today - target

  let prefix = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  if (diff === 0) prefix = 'Hoje'
  else if (diff === 86_400_000) prefix = 'Ontem'

  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${prefix}, ${time}`
}

type FilterMode = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'MAX'

type PaymentsPageProps = {
  payments: Payment[]
  sales: Sale[]
  clients: Client[]
  clientBalances: Map<string, number>
  userName?: string | null
  onGenerateReceipt: (payment: Payment) => void
  onDeletePayment: (paymentId: string) => void
  onPayDebt: (clientId: string) => void
}

type ListItem = {
  id: string
  clientId?: string
  name: string
  amount: number
  date: number
  subtitle: string
  payment?: Payment
}

export function PaymentsPage({
  payments,
  sales,
  clients,
  clientBalances,
  userName,
  onGenerateReceipt,
  onDeletePayment,
  onPayDebt
}: PaymentsPageProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('ALL')
  const [receivedMode, setReceivedMode] = useState<'month' | 'total'>('month')
  const [showPaymentPicker, setShowPaymentPicker] = useState(false)
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null)
  const [showFloatingHeader, setShowFloatingHeader] = useState(false)
  const [showFullHistory, setShowFullHistory] = useState(false)

  const paymentCandidates = useMemo(
    () =>
      clients
        .filter((client) => (clientBalances.get(client.id) || 0) > 0)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [clients, clientBalances]
  )

  useEffect(() => {
    if (paymentCandidates.length <= 1) {
      setShowPaymentPicker(false)
    }
  }, [paymentCandidates.length])

  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingHeader(window.scrollY > 20)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
    []
  )

  const formatCurrency = (val: number) => currencyFormatter.format(val || 0)

  const totalReceived = useMemo(
    () => payments.reduce((acc, payment) => acc + (payment.amount || 0), 0),
    [payments]
  )
  const litersReceivable = useMemo(() => {
    const unpaidByClient = new Map<string, { liters: number; value: number }>()
    sales.forEach((sale) => {
      if (sale.isPaid === true || sale.paymentStatus !== 'PRAZO') return
      const current = unpaidByClient.get(sale.clientId) || { liters: 0, value: 0 }
      unpaidByClient.set(sale.clientId, {
        liters: current.liters + (sale.liters || 0),
        value: current.value + (sale.totalValue || 0)
      })
    })

    const balanceByClient = new Map<string, number>()
    sales.forEach((sale) => {
      if (sale.paymentStatus !== 'PRAZO') return
      balanceByClient.set(
        sale.clientId,
        (balanceByClient.get(sale.clientId) || 0) + (sale.totalValue || 0)
      )
    })
    payments.forEach((payment) => {
      balanceByClient.set(
        payment.clientId,
        (balanceByClient.get(payment.clientId) || 0) - (payment.amount || 0)
      )
    })

    let totalLiters = 0
    unpaidByClient.forEach((data, clientId) => {
      const balance = Math.max(0, balanceByClient.get(clientId) || 0)
      if (balance <= 0 || data.value <= 0) return
      const ratio = Math.min(balance / data.value, 1)
      totalLiters += data.liters * ratio
    })

    return totalLiters
  }, [sales, payments])
  const totalReceivedMonthly = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    return payments.reduce((acc, payment) => {
      const d = parseDate(payment.date as any)
      if (!d) return acc
      if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) return acc
      return acc + (payment.amount || 0)
    }, 0)
  }, [payments])
  const todaySummary = useMemo(() => {
    const today = startOfDay(new Date())
    const todayPayments = payments.filter((payment) => startOfDay(new Date(normalizeTs(payment.date))) === today)
    return {
      amount: todayPayments.reduce((total, payment) => total + (payment.amount || 0), 0),
      count: todayPayments.length
    }
  }, [payments])
  const clientsWithBalance = useMemo(
    () => clients.filter((client) => (clientBalances.get(client.id) || 0) > 0).length,
    [clients, clientBalances]
  )

  const totalReceivable = useMemo(() => {
    return clients.reduce((acc, client) => {
      const bal = clientBalances.get(client.id) || 0
      return acc + Math.max(0, bal)
    }, 0)
  }, [clients, clientBalances])

  const filteredItems = useMemo<ListItem[]>(() => {
    const now = new Date()
    const todayStart = startOfDay(now)
    const weekStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6))
    const query = searchQuery.trim().toLowerCase()

    let list = payments.map((payment) => {
      const ts = normalizeTs(payment.date)
      return {
        id: payment.id,
        clientId: payment.clientId,
        name: payment.clientName || 'Pagamento',
        amount: payment.amount || 0,
        date: ts,
        subtitle: formatDayWithTime(ts).replace(', ', ' · '),
        payment
      }
    })

    if (filterMode === 'TODAY') {
      list = list.filter((item) => startOfDay(new Date(item.date)) === todayStart)
    } else if (filterMode === 'WEEK') {
      list = list.filter((item) => item.date >= weekStart && item.date <= now.getTime())
    } else if (filterMode === 'MONTH') {
      list = list.filter((item) => {
        const d = parseDate(item.date)
        if (!d) return false
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      })
    }

    if (query) {
      list = list.filter((item) => item.name.toLowerCase().includes(query))
    }

    if (filterMode === 'MAX') {
      list = list.sort((a, b) => (b.amount || 0) - (a.amount || 0))
    } else {
      list = list.sort((a, b) => b.date - a.date)
    }

    return list
  }, [payments, searchQuery, filterMode])

  const handleAddPayment = () => {
    if (paymentCandidates.length === 0) return
    if (paymentCandidates.length === 1) {
      onPayDebt(paymentCandidates[0].id)
      return
    }
    setShowPaymentPicker(true)
  }

  const handleSelectPaymentClient = (clientId: string) => {
    setShowPaymentPicker(false)
    onPayDebt(clientId)
  }

  const handleRowClick = (item: ListItem) => {
    setExpandedPaymentId((prev) => (prev === item.id ? null : item.id))
    console.log('Abrir detalhes do pagamento', item.id)
  }

  return (
    <div
      data-theme='flat-lime'
      className='min-h-full'
      style={{
        background: 'var(--bg)',
        color: 'var(--text)',
        paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
        paddingLeft: 16,
        paddingRight: 16
      }}
    >
      <PageBrandHeader userName={userName} />
      {showFloatingHeader && (
        <div
          className='fixed top-0 left-0 right-0 z-30 flex items-center pointer-events-none'
          style={{
            paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))',
            paddingBottom: 10,
            paddingLeft: 16,
            paddingRight: 16,
            background: 'rgba(245, 247, 240, 0.94)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}
        >
          <h2 className='text-[24px] font-semibold leading-none' style={{ color: 'var(--text)' }}>
            Pagamentos
          </h2>
        </div>
      )}

      <div className='mt-6 flex items-start justify-between gap-4 mb-4'>
        <div>
          <h1 className='text-[24px] font-bold leading-none'>Pagamentos</h1>
          <p className='mt-1.5 text-[11px]' style={{ color: 'var(--muted)' }}>
            Acompanhe entradas e valores em aberto.
          </p>
        </div>
        <IconButton
          aria-label='Novo pagamento'
          onClick={handleAddPayment}
          disabled={paymentCandidates.length === 0}
          icon={<Plus size={16} />}
          className='h-9 w-9 mt-1'
          style={{
            backgroundColor: 'var(--accent)',
            color: 'var(--accent-ink)',
            boxShadow: '0 8px 20px -14px var(--shadow)',
            width: 38,
            height: 38
          }}
        />
      </div>

      <section className='space-y-2 mb-5'>
        <div className='rounded-2xl p-4 text-white' style={{ background: 'var(--primary)' }}>
          <p className='text-[10px] font-medium text-white/75'>Total em aberto</p>
          <div className='mt-1 flex items-end justify-between gap-2'>
            <p className='text-[25px] leading-tight font-bold whitespace-nowrap'>{formatCurrency(totalReceivable)}</p>
            <button
              type='button'
              onClick={() => setShowFullHistory(true)}
              className='mb-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#d7e996]'
            >
              Ver lista <ChevronRight size={14} />
            </button>
          </div>
          <p className='mt-1 text-[10px] text-white/75'>{clientsWithBalance} clientes com saldo</p>
        </div>
        <div className='grid grid-cols-2 gap-2'>
          <div className='flat-card p-3' style={{ background: 'var(--accent-soft)', borderColor: '#dce9c1' }}>
            <p className='text-[10px]' style={{ color: 'var(--muted)' }}>Recebido hoje</p>
            <p className='mt-1 text-lg leading-tight font-bold' style={{ color: 'var(--text)' }}>{formatCurrency(todaySummary.amount)}</p>
            <p className='mt-1 text-[10px]' style={{ color: 'var(--muted)' }}>{todaySummary.count} pagamentos</p>
          </div>
          <div className='flat-card p-3'>
            <p className='text-[10px]' style={{ color: 'var(--muted)' }}>Recebido no mês</p>
            <p className='mt-1 text-lg leading-tight font-bold' style={{ color: 'var(--text)' }}>{formatCurrency(totalReceivedMonthly)}</p>
            <p className='mt-1 text-[10px]' style={{ color: 'var(--muted)' }}>Até {String(new Date().getDate()).padStart(2, '0')} {new Date().toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</p>
          </div>
        </div>
      </section>
      <div className={`relative mb-3 ${showFullHistory ? '' : 'hidden'}`}>
        <div className='absolute inset-y-0 left-3 flex items-center pointer-events-none'>
          <Search size={18} style={{ color: 'var(--muted)' }} />
        </div>
        <input
          type='text'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder='Buscar cliente...'
          className='w-full flat-input pl-10 pr-11 py-3 text-base outline-none focus:ring-2'
          style={{
            background: 'var(--surface-2)',
            color: 'var(--text)',
            borderColor: 'var(--border)',
            boxShadow: 'none',
            caretColor: 'var(--accent)',
            borderRadius: 9999
          }}
        />
        {searchQuery && (
          <button
            type='button'
            onClick={() => setSearchQuery('')}
            className='absolute inset-y-0 right-3 flex items-center'
            style={{ color: 'var(--muted)' }}
            aria-label='Limpar busca'
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showFullHistory && <FilterChips
        value={filterMode}
        onChange={setFilterMode}
        options={[
          { label: 'Todos', value: 'ALL' },
          { label: 'Hoje', value: 'TODAY' },
          { label: 'Semana', value: 'WEEK' },
          { label: 'M\u00eas', value: 'MONTH' }
        ]}
      />}

      {showPaymentPicker && paymentCandidates.length > 1 && (
        <div className='flat-card p-4 mt-4 space-y-3'>
          <div className='flex items-center justify-between'>
            <p className='text-sm font-semibold'>Selecione um cliente</p>
            <button
              type='button'
              onClick={() => setShowPaymentPicker(false)}
              aria-label='Fechar sele\u00e7\u00e3o'
              style={{ color: 'var(--muted)' }}
            >
              <X size={16} />
            </button>
          </div>
          <div className='max-h-56 overflow-y-auto no-scrollbar space-y-2'>
            {paymentCandidates.map((client) => {
              const balance = clientBalances.get(client.id) || 0
              return (
                <button
                  key={client.id}
                  type='button'
                  onClick={() => handleSelectPaymentClient(client.id)}
                  className='w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl transition-colors'
                  style={{
                    background: 'var(--surface-2)',
                    border: `1px solid var(--border)`
                  }}
                >
                  <span className='text-sm font-semibold'>{client.name}</span>
                  <span className='text-sm font-semibold' style={{ color: 'var(--accent)' }}>
                    {formatCurrency(balance)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className='mt-5 mb-2 flex items-center justify-between'>
        <h3 className='text-sm font-semibold' style={{ color: 'var(--text)' }}>
          {'Movimentações'}
        </h3>
        {payments.length > 0 && (
          <button
            type='button'
            onClick={() => setShowFullHistory((current) => !current)}
            className='text-[10px] font-semibold'
            style={{ color: 'var(--primary)' }}
          >
            {showFullHistory ? 'Ver recentes' : 'Ver hist\u00f3rico'}
          </button>
        )}
      </div>

      {payments.length === 0 ? (
        <div
          className='flat-card p-6 text-center'
          style={{
            borderStyle: 'dashed',
            borderColor: 'var(--border)'
          }}
        >
          <Wallet size={48} className='mx-auto mb-3' style={{ color: 'var(--muted)' }} />
          <p className='text-base font-semibold'>Nenhum pagamento registrado</p>
          <p className='text-sm' style={{ color: 'var(--muted)' }}>
            {'Os pagamentos aparecer\u00e3o aqui.'}
          </p>
          <button
            type='button'
            onClick={handleAddPayment}
            disabled={paymentCandidates.length === 0}
            className='mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-transform active:scale-95 disabled:opacity-60'
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-ink)',
              border: '1px solid var(--accent)'
            }}
          >
            <Plus size={14} strokeWidth={3} />
            Registrar recebimento
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className='flat-card p-4 text-center'>
          <p className='text-sm' style={{ color: 'var(--muted)' }}>
            Nenhum resultado para essa busca.
          </p>
          <button
            type='button'
            onClick={() => {
              setSearchQuery('')
              setFilterMode('ALL')
            }}
            className='mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-transform active:scale-95'
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text)'
            }}
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className='flat-card overflow-hidden'>
          {(showFullHistory ? filteredItems : filteredItems.slice(0, 5)).map((item, index) => (
            <div key={item.id}>
              {index > 0 && (
                <div
                  className='h-px'
                  style={{
                    background: 'var(--border)',
                    marginLeft: 16,
                    marginRight: 16
                  }}
                />
              )}
              <PaymentRow
                name={item.name}
                subtitle={item.subtitle}
                amount={formatCurrency(item.amount)}
                status='received'
                onClick={() => handleRowClick(item)}
                isExpanded={expandedPaymentId === item.id}
                variant='list'
              >
                {item.payment && (
                  <div className='space-y-3'>
                    {item.payment.salesSnapshot && item.payment.salesSnapshot.length > 0 && (
                    <div className='space-y-2'>
                      <p className='text-xs font-semibold uppercase' style={{ color: 'var(--muted)' }}>
                        Itens pagos
                      </p>
                      <div className='space-y-2'>
                        {item.payment.salesSnapshot.map((sale, idx) => {
                          const saleDate = parseDate(sale.date as any)
                          const saleLabel = saleDate
                            ? saleDate.toLocaleDateString('pt-BR')
                            : 'Data'
                          return (
                            <div
                              key={sale.id || idx}
                              className='flex items-center justify-between text-sm'
                              style={{ color: 'var(--text)' }}
                            >
                              <span>
                                {saleLabel} - {sale.liters} {sale.liters === 1 ? 'litro' : 'litros'}
                              </span>
                              <span className='font-semibold'>{formatCurrency(sale.totalValue)}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className='flex gap-2'>
                    <button
                      type='button'
                      onClick={() => onGenerateReceipt(item.payment!)}
                      className='flex-1 px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-transform active:scale-[0.99]'
                      style={{
                        background: 'var(--surface)',
                        border: `1px solid var(--border)`
                      }}
                    >
                      <FileText size={16} />
                      Ver comprovante
                    </button>
                    <button
                      type='button'
                      onClick={() => onDeletePayment(item.payment.id)}
                      className='px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-transform active:scale-[0.99]'
                      style={{
                        background: 'var(--surface)',
                        border: `1px solid var(--border)`,
                        color: 'var(--danger)'
                      }}
                    >
                      <Trash2 size={16} />
                      Excluir
                    </button>
                  </div>
                  </div>
                )}
            </PaymentRow>
          </div>
          ))}
        </div>
      )}
    </div>
  )
}

