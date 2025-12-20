import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Eye, EyeOff, FileText, Plus, Search, SlidersHorizontal, Trash2, Wallet, X } from 'lucide-react'
import type { Client, Payment } from '@/types'
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
  if (!ts) return 'Data indisponivel'
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
type TotalFilter = 'TOTAL' | 'DAY' | 'WEEK' | 'MONTH'

type PaymentsPageProps = {
  payments: Payment[]
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
  clients,
  clientBalances,
  onGenerateReceipt,
  onDeletePayment,
  onPayDebt
}: PaymentsPageProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('ALL')
  const [totalFilter, setTotalFilter] = useState<TotalFilter>('TOTAL')
  const [showTotalFilter, setShowTotalFilter] = useState(false)
  const [showTotalAmount, setShowTotalAmount] = useState(true)
  const [showPaymentPicker, setShowPaymentPicker] = useState(false)
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null)
  const [showFloatingHeader, setShowFloatingHeader] = useState(false)
  const totalFilterRef = useRef<HTMLDivElement | null>(null)

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
    if (!showTotalFilter) return
    const handlePointer = (event: MouseEvent | TouchEvent) => {
      if (!totalFilterRef.current) return
      if (!totalFilterRef.current.contains(event.target as Node)) {
        setShowTotalFilter(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowTotalFilter(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('touchstart', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('touchstart', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [showTotalFilter])

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

  const totalReceived = useMemo(() => {
    const now = new Date()
    const todayStart = startOfDay(now)
    const weekStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6))
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    return payments.reduce((acc, payment) => {
      const d = parseDate(payment.date as any)
      if (!d) return acc
      const ts = d.getTime()

      if (totalFilter === 'DAY') {
        if (startOfDay(d) !== todayStart) return acc
      } else if (totalFilter === 'WEEK') {
        if (ts < weekStart || ts > now.getTime()) return acc
      } else if (totalFilter === 'MONTH') {
        if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) return acc
      }

      return acc + (payment.amount || 0)
    }, 0)
  }, [payments, totalFilter])

  const totalFilterLabel =
    totalFilter === 'DAY'
      ? 'Hoje'
      : totalFilter === 'WEEK'
        ? 'Semana'
        : totalFilter === 'MONTH'
          ? 'Mês'
          : 'Total'
  const totalFilterOptions: Array<{ value: TotalFilter; label: string }> = [
    { value: 'DAY', label: 'Hoje' },
    { value: 'WEEK', label: 'Semana' },
    { value: 'MONTH', label: 'Mês' },
    { value: 'TOTAL', label: 'Total' }
  ]

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
        subtitle: `${formatDayWithTime(ts)} • Recebido`,
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
            background: 'rgba(11, 15, 20, 0.6)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(30, 42, 56, 0.6)'
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

      <div className='grid grid-cols-1 gap-3 mb-4'>
        <StatCard
          label='Total recebido'
          value={showTotalAmount ? formatCurrency(totalReceived) : 'R$ ••••'}
          valueTone='accent'
          headerAction={
            <div className='flex flex-col gap-2'>
              <div ref={totalFilterRef} className='relative'>
                <button
                  type='button'
                  onClick={() => setShowTotalFilter((prev) => !prev)}
                  aria-label='Filtrar total recebido'
                  className='h-8 w-8 rounded-full flex items-center justify-center transition-transform active:scale-[0.98]'
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)'
                  }}
                  title={`Filtro: ${totalFilterLabel}`}
                >
                  <SlidersHorizontal size={14} />
                </button>
                {showTotalFilter && (
                  <div
                    className='absolute right-0 mt-2 w-36 p-2 space-y-1 z-20 rounded-xl'
                    style={{
                      background: 'rgba(18, 24, 33, 0.78)',
                      border: '1px solid rgba(30, 42, 56, 0.75)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 16px 32px -24px var(--shadow)'
                    }}
                  >
                    {totalFilterOptions.map((option) => {
                      const isActive = totalFilter === option.value
                      return (
                        <button
                          key={option.value}
                          type='button'
                          onClick={() => {
                            setTotalFilter(option.value)
                            setShowTotalFilter(false)
                          }}
                          className='w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors'
                          style={
                            isActive
                              ? {
                                  background: 'var(--accent)',
                                  color: 'var(--accent-ink)',
                                  border: '1px solid var(--accent)'
                                }
                              : {
                                  background: 'var(--surface-2)',
                                  color: 'var(--text)',
                                  border: '1px solid var(--border)'
                                }
                          }
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              <button
                type='button'
                onClick={() => setShowTotalAmount((prev) => !prev)}
                aria-label={showTotalAmount ? 'Ocultar saldo' : 'Mostrar saldo'}
                className='h-8 w-8 flex items-center justify-center transition-transform active:scale-[0.98]'
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)'
                }}
                title={showTotalAmount ? 'Ocultar saldo' : 'Mostrar saldo'}
              >
                {showTotalAmount ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
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
          { label: 'Mês', value: 'MONTH' },
          { label: 'Maior valor', value: 'MAX' }
        ]}
      />

      {showPaymentPicker && paymentCandidates.length > 1 && (
        <div className='flat-card p-4 mt-4 space-y-3'>
          <div className='flex items-center justify-between'>
            <p className='text-sm font-semibold'>Selecione um cliente</p>
            <button
              type='button'
              onClick={() => setShowPaymentPicker(false)}
              aria-label='Fechar selecao'
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
          Lançamentos Recentes
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
            Os pagamentos aparecerão aqui.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className='flat-card p-4 text-center'>
          <p className='text-sm' style={{ color: 'var(--muted)' }}>
            Nenhum resultado para essa busca.
          </p>
        </div>
      ) : (
        <div className='space-y-3 pb-4'>
          {filteredItems.map((item) => (
            <PaymentRow
              key={item.id}
              name={item.name}
              subtitle={item.subtitle}
              amount={formatCurrency(item.amount)}
              status='received'
              onClick={() => handleRowClick(item)}
              isExpanded={expandedPaymentId === item.id}
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
                                {saleLabel} • {sale.liters} {sale.liters === 1 ? 'litro' : 'litros'}
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
          ))}
        </div>
      )}
    </div>
  )
}
