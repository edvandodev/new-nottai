import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle, FileText, Plus, Search, Trash2, Wallet, X } from 'lucide-react'
import type { Client, Payment, Sale } from '@/types'
import { StatCard } from '@/components/payments/StatCard'
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
    const byClient = new Map<string, { liters: number; value: number }>()
    sales.forEach((sale) => {
      if (sale.isPaid === true || sale.paymentStatus !== 'PRAZO') return
      const prev = byClient.get(sale.clientId) || { liters: 0, value: 0 }
      byClient.set(sale.clientId, {
        liters: prev.liters + (sale.liters || 0),
        value: prev.value + (sale.totalValue || 0)
      })
    })

    let totalLiters = 0
    byClient.forEach((data, clientId) => {
      const balance = Math.max(0, clientBalances.get(clientId) || 0)
      if (balance <= 0 || data.value <= 0) return
      const ratio = Math.min(balance / data.value, 1)
      totalLiters += data.liters * ratio
    })

    return totalLiters
  }, [sales, clientBalances])
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
        subtitle: `${formatDayWithTime(ts)} - Recebido`,
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
      {showFloatingHeader && (
        <div
          className='fixed top-0 left-0 right-0 z-30 flex items-center pointer-events-none'
          style={{
            paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))',
            paddingBottom: 10,
            paddingLeft: 16,
            paddingRight: 16,
            background:
              'linear-gradient(180deg, rgba(11, 15, 20, 0.98) 0%, rgba(11, 15, 20, 0.7) 45%, rgba(11, 15, 20, 0) 100%)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}
        >
          <h2 className='text-[24px] font-semibold leading-none' style={{ color: 'var(--text)' }}>
            Pagamentos
          </h2>
        </div>
      )}

      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-[24px] font-semibold leading-none'>Pagamentos</h1>
        <IconButton
          aria-label='Novo pagamento'
          onClick={handleAddPayment}
          disabled={paymentCandidates.length === 0}
          icon={<Plus size={16} />}
          className='h-9 w-9'
          style={{
            backgroundColor: 'var(--accent)',
            color: 'var(--accent-ink)',
            boxShadow: '0 8px 20px -14px var(--shadow)',
            width: 38,
            height: 38
          }}
        />
      </div>

      <div className='grid grid-cols-2 gap-3 mb-4'>
        <StatCard
          label='Recebido'
          value={formatCurrency(receivedMode === 'month' ? totalReceivedMonthly : totalReceived)}
          valueTone='neutral'
          variant='accent'
          helperText={receivedMode === 'month' ? 'Total mensal' : 'Total geral'}
          headerAction={
            <button
              type='button'
              onClick={() =>
                setReceivedMode((prev) => (prev === 'month' ? 'total' : 'month'))
              }
              className='h-7 w-7 rounded-full flex items-center justify-center border'
              style={{
                background: 'rgba(34, 197, 94, 0.18)',
                borderColor: 'rgba(34, 197, 94, 0.45)',
                color: '#4ade80'
              }}
              aria-label={
                receivedMode === 'month' ? 'Mostrar total geral' : 'Mostrar total mensal'
              }
            >
              <CheckCircle size={12} />
            </button>
          }
        />
        <StatCard
          label='Total a receber'
          value={formatCurrency(totalReceivable)}
          valueTone='neutral'
          variant='accent'
          accentTone='lime'
          helperText={`${litersReceivable.toLocaleString('pt-BR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          })} L`}
          headerAction={
            <div
              className='h-7 w-7 rounded-full flex items-center justify-center border'
              style={{
                background: 'rgba(184, 255, 44, 0.18)',
                borderColor: 'rgba(184, 255, 44, 0.45)',
                color: 'var(--accent)'
              }}
              aria-hidden='true'
            >
              <Wallet size={12} />
            </div>
          }
        />
      </div>
      <div className='relative mb-3'>
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

      <FilterChips
        value={filterMode}
        onChange={setFilterMode}
        options={[
          { label: 'Todos', value: 'ALL' },
          { label: 'Hoje', value: 'TODAY' },
          { label: 'Semana', value: 'WEEK' },
          { label: 'M\u00eas', value: 'MONTH' }
        ]}
      />

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

      <div className='mt-6 mb-3 flex items-center justify-between'>
        <h3 className='text-sm font-semibold uppercase tracking-wide' style={{ color: 'var(--muted)' }}>
          {'Lan\u00e7amentos recentes'}
        </h3>
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
        <div
          className='rounded-[22px] border overflow-hidden pb-1'
          style={{
            background:
              'linear-gradient(180deg, rgba(18, 24, 33, 0.96) 0%, rgba(14, 19, 26, 0.92) 100%)',
            borderColor: 'rgba(30, 42, 56, 0.9)',
            boxShadow: '0 18px 36px -28px rgba(0, 0, 0, 0.7)'
          }}
        >
          {filteredItems.map((item, index) => (
            <div key={item.id}>
              {index > 0 && (
                <div
                  className='h-px'
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
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

