import React, { useEffect, useMemo, useState } from 'react'
import { FileText, Plus, Search, Trash2, Wallet, X } from 'lucide-react'
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
  const [showPaymentPicker, setShowPaymentPicker] = useState(false)
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null)

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

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
    []
  )

  const formatCurrency = (val: number) => currencyFormatter.format(val || 0)

  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  const receivedThisMonth = useMemo(
    () =>
      payments.reduce((acc, payment) => {
        const d = parseDate(payment.date as any)
        if (!d) return acc
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          acc += payment.amount || 0
        }
        return acc
      }, 0),
    [payments, currentMonth, currentYear]
  )

  const totalReceived = useMemo(
    () => payments.reduce((acc, payment) => acc + (payment.amount || 0), 0),
    [payments]
  )

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
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-[24px] font-semibold leading-none'>Pagamentos</h1>
        <IconButton
          aria-label='Novo pagamento'
          onClick={handleAddPayment}
          disabled={paymentCandidates.length === 0}
          icon={<Plus size={22} />}
          style={{
            backgroundColor: 'var(--accent)',
            color: 'var(--accent-ink)',
            boxShadow: '0 10px 28px -16px var(--shadow)'
          }}
        />
      </div>

      <div className='grid grid-cols-2 gap-3 mb-4'>
        <StatCard label='Recebido no mes' value={formatCurrency(receivedThisMonth)} variant='accent' />
        <StatCard label='Total recebido' value={formatCurrency(totalReceived)} variant='neutral' />
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
          { label: 'Mes', value: 'MONTH' },
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
          Lancamentos Recentes
        </h3>
        <span className='text-xs' style={{ color: 'var(--muted)' }}>
          {filteredItems.length} itens
        </span>
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
