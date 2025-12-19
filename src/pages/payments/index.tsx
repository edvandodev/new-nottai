import React, { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Plus,
  Search,
  Trash2,
  Wallet,
  X
} from 'lucide-react'
import type { Client, Payment, Sale } from '@/types'

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

const MONTHS_SHORT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez'
]

const formatDayLabel = (ts: number) => {
  const d = new Date(ts)
  const now = new Date()
  const startOfDay = (dt: Date) =>
    new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime()
  const today = startOfDay(now)
  const target = startOfDay(d)
  const diff = today - target

  if (diff === 0) return 'HOJE'
  if (diff === 86_400_000) return 'ONTEM'

  const day = String(d.getDate()).padStart(2, '0')
  const month = MONTHS_SHORT[d.getMonth()]
  return `${day} ${month}`.toUpperCase()
}

const getInitials = (name: string) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

const getAvatarColors = (input: string) => {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  return {
    bg: `hsl(${hue}, 35%, 22%)`,
    text: `hsl(${hue}, 70%, 80%)`
  }
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

export function PaymentsPage({
  payments,
  clients,
  clientBalances,
  onGenerateReceipt,
  onDeletePayment,
  onPayDebt
}: PaymentsPageProps) {
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('ALL')
  const [showPaymentPicker, setShowPaymentPicker] = useState(false)

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(handle)
  }, [searchQuery])

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const totalReceived = useMemo(
    () => payments.reduce((acc, p) => acc + (p.amount || 0), 0),
    [payments]
  )

  const paymentCandidates = useMemo(() => {
    return clients
      .filter((c) => (clientBalances.get(c.id) || 0) > 0)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [clients, clientBalances])

  useEffect(() => {
    if (paymentCandidates.length <= 1) {
      setShowPaymentPicker(false)
    }
  }, [paymentCandidates.length])

  const filteredPayments = useMemo(() => {
    const now = new Date()
    const startOfDay = (dt: Date) =>
      new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime()
    const todayStart = startOfDay(now)
    const weekStart = startOfDay(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
    )
    const q = debouncedQuery.trim().toLowerCase()
    const qDigits = q.replace(/\D/g, '')

    let result = [...payments]

    if (filterMode === 'TODAY') {
      result = result.filter((p) => {
        const ts = normalizeTs(p.date)
        if (!ts) return false
        return startOfDay(new Date(ts)) === todayStart
      })
    }

    if (filterMode === 'WEEK') {
      result = result.filter((p) => {
        const ts = normalizeTs(p.date)
        if (!ts) return false
        return ts >= weekStart && ts <= now.getTime()
      })
    }

    if (filterMode === 'MONTH') {
      result = result.filter((p) => {
        const d = parseDate(p.date as any)
        if (!d) return false
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      })
    }

    if (q) {
      result = result.filter((p) => {
        const paymentDate = parseDate(p.date as any)
        const dateLabel =
          paymentDate?.toLocaleDateString('pt-BR') || ''
        const timeLabel =
          paymentDate?.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          }) || ''
        const amountText = formatCurrency(p.amount || 0).toLowerCase()
        const amountDigits = amountText.replace(/\D/g, '')
        const searchBlob = `${p.clientName || ''} ${dateLabel} ${timeLabel} ${amountText}`.toLowerCase()

        if (qDigits && amountDigits.includes(qDigits)) return true
        return searchBlob.includes(q)
      })
    }

    if (filterMode === 'MAX') {
      return result.sort((a, b) => (b.amount || 0) - (a.amount || 0))
    }

    return result.sort((a, b) => normalizeTs(b.date) - normalizeTs(a.date))
  }, [payments, debouncedQuery, filterMode])

  const groupedPayments = useMemo(() => {
    const groups: { label: string; items: Payment[] }[] = []
    filteredPayments.forEach((p) => {
      const ts = normalizeTs(p.date)
      const label = formatDayLabel(ts)
      const existing = groups.find((g) => g.label === label)
      if (existing) existing.items.push(p)
      else groups.push({ label, items: [p] })
    })
    return groups
  }, [filteredPayments])

  const togglePaymentExpand = (id: string) => {
    setExpandedPaymentId((prev) => (prev === id ? null : id))
  }

  const handlePaymentCTA = () => {
    if (paymentCandidates.length === 0) return
    if (paymentCandidates.length === 1) {
      onPayDebt(paymentCandidates[0].id)
      return
    }
    setShowPaymentPicker((prev) => !prev)
  }

  const handleSelectPaymentClient = (clientId: string) => {
    setShowPaymentPicker(false)
    onPayDebt(clientId)
  }

  return (
    <div
      className='space-y-4 animate-fade-in'
      style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <h2 className='text-sm uppercase tracking-wider text-slate-500 font-semibold ml-1'>
        Histórico
      </h2>

      <div className='bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between relative overflow-hidden'>
        <div className='absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none' />
        <div className='relative z-10'>
          <span className='block text-slate-400 text-sm font-medium mb-1'>
            Total recebido (histórico)
          </span>
          <span className='text-3xl font-bold text-white tracking-tight'>
            {formatCurrency(totalReceived)}
          </span>
        </div>
        <button
          type='button'
          onClick={handlePaymentCTA}
          disabled={paymentCandidates.length === 0}
          className={`relative z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
            paymentCandidates.length > 0
              ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30 hover:bg-blue-600/30'
              : 'bg-slate-800/60 text-slate-500 border border-slate-700 cursor-not-allowed'
          }`}
        >
          <Plus size={14} />
          Novo Pagamento
        </button>
      </div>

      {showPaymentPicker && paymentCandidates.length > 1 && (
        <div className='bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-3'>
            <p className='text-sm font-semibold text-slate-200'>
              Selecione um cliente para receber
            </p>
            <button
              type='button'
              onClick={() => setShowPaymentPicker(false)}
              className='text-slate-500 hover:text-slate-200 transition-colors'
              aria-label='Fechar seleção'
            >
              <X size={16} />
            </button>
          </div>
          <div className='max-h-56 overflow-y-auto custom-scrollbar space-y-2'>
            {paymentCandidates.map((client) => {
              const balance = clientBalances.get(client.id) || 0
              const initials = getInitials(client.name)
              const colors = getAvatarColors(client.name)
              return (
                <button
                  key={client.id}
                  type='button'
                  onClick={() => handleSelectPaymentClient(client.id)}
                  className='w-full flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-left hover:border-slate-700 transition-all active:scale-[0.98]'
                >
                  <div className='flex items-center gap-3 min-w-0'>
                    <div
                      className='h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0'
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                    >
                      {initials}
                    </div>
                    <span className='text-sm text-slate-100 font-semibold truncate'>
                      {client.name}
                    </span>
                  </div>
                  <span className='text-sm font-semibold text-emerald-300 tabular-nums'>
                    {formatCurrency(balance)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className='relative'>
        <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
          <Search size={18} className='text-slate-500' />
        </div>
        <input
          type='text'
          className='w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-10 pr-10 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all'
          placeholder='Buscar por cliente, valor ou data...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className='absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white transition-colors active:scale-95'
            aria-label='Limpar busca'
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className='flex gap-2 overflow-x-auto no-scrollbar pt-0.5'>
        {[
          { label: 'Todos', value: 'ALL' as const },
          { label: 'Hoje', value: 'TODAY' as const },
          { label: 'Semana', value: 'WEEK' as const },
          { label: 'Mês', value: 'MONTH' as const },
          { label: 'Maior valor', value: 'MAX' as const }
        ].map((chip) => {
          const isActive = filterMode === chip.value
          return (
            <button
              key={chip.value}
              type='button'
              onClick={() => setFilterMode(chip.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                isActive
                  ? 'bg-blue-600/20 text-blue-200 border-blue-500/30'
                  : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      {payments.length === 0 ? (
        <div className='text-center py-20 px-6 rounded-2xl bg-slate-900 border border-slate-800 border-dashed'>
          <Wallet size={48} className='mx-auto text-slate-700 mb-4' />
          <p className='text-slate-400 text-lg'>Nenhum pagamento registrado.</p>
          <p className='text-slate-600 text-sm mt-1'>
            Os pagamentos confirmados aparecerão aqui.
          </p>
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className='text-center py-16 px-6 rounded-2xl bg-slate-900/60 border border-slate-800'>
          <p className='text-slate-400 text-base'>Nenhum pagamento encontrado</p>
        </div>
      ) : (
        <div className='space-y-4'>
          {groupedPayments.map((group) => (
            <div key={group.label} className='space-y-2'>
              <span className='inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-slate-900/60 border border-slate-800 text-slate-400'>
                {group.label}
              </span>
              <div className='space-y-2'>
                {group.items.map((payment) => {
                  const paymentDate = parseDate(payment.date as any)
                  const dateLabel =
                    paymentDate?.toLocaleDateString('pt-BR') || 'Data indisponível'
                  const timeLabel =
                    paymentDate?.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    }) || '--:--'
                  const isExpanded = expandedPaymentId === payment.id

                  return (
                    <div
                      key={payment.id}
                      className='bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden shadow-[0_6px_18px_rgba(0,0,0,0.18)] transition-all'
                    >
                      <button
                        type='button'
                        onClick={() => togglePaymentExpand(payment.id)}
                        className='w-full px-3.5 py-3 flex items-center justify-between gap-3 text-left hover:border-slate-700 active:scale-[0.98] active:opacity-90 transition-all'
                      >
                        <div className='flex gap-3 items-center min-w-0'>
                          <div className='h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'>
                            <Wallet size={18} />
                          </div>
                          <div className='min-w-0'>
                            <p className='text-white font-semibold truncate'>
                              {payment.clientName}
                            </p>
                            <p className='text-xs text-slate-500'>
                              {dateLabel} • {timeLabel}
                            </p>
                          </div>
                        </div>

                        <div className='text-right flex items-center gap-2 shrink-0'>
                          <span className='text-emerald-400 font-bold text-base tabular-nums'>
                            {formatCurrency(payment.amount)}
                          </span>
                          {isExpanded ? (
                            <ChevronUp size={18} className='text-slate-500' />
                          ) : (
                            <ChevronDown size={18} className='text-slate-500' />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className='px-3.5 pb-3 pt-2 border-t border-slate-800/70 bg-slate-900/40 animate-fade-in'>
                          <div className='mt-2 mb-3 space-y-2'>
                            <h4 className='text-[11px] font-semibold text-slate-500 uppercase tracking-wide'>
                              Itens pagos
                            </h4>

                            {payment.salesSnapshot && payment.salesSnapshot.length > 0 ? (
                              <div className='space-y-2'>
                                {payment.salesSnapshot.map((sale: Sale) => {
                                  const saleDate = parseDate(sale.date as any)
                                  const saleLabel =
                                    saleDate?.toLocaleDateString('pt-BR') || 'Data'
                                  return (
                                    <div
                                      key={sale.id}
                                      className='flex justify-between text-sm text-slate-300 border-b border-slate-800/70 pb-1.5 last:border-0'
                                    >
                                      <span>
                                        {saleLabel} - {sale.liters}{' '}
                                        {sale.liters === 1 ? 'Litro' : 'Litros'}
                                      </span>
                                      <span>{formatCurrency(sale.totalValue)}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <p className='text-sm text-slate-500 italic'>
                                Detalhes não disponíveis para este registro.
                              </p>
                            )}
                          </div>

                          <div className='flex gap-2'>
                            {payment.salesSnapshot && (
                              <button
                                onClick={() => void onGenerateReceipt(payment)}
                                className='flex-1 py-2 bg-blue-600/10 text-blue-300 hover:bg-blue-600/20 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 border border-blue-600/30 transition-colors active:scale-95'
                              >
                                <FileText size={16} />
                                Ver comprovante PDF
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeletePayment(payment.id)
                              }}
                              className='px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/30 active:scale-95'
                              title='Apagar registro'
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type='button'
        onClick={handlePaymentCTA}
        disabled={paymentCandidates.length === 0}
        className={`fixed right-5 rounded-full h-12 w-12 flex items-center justify-center shadow-lg transition-all active:scale-95 ${
          paymentCandidates.length > 0
            ? 'bg-blue-600 text-white hover:bg-blue-500'
            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
        }`}
        style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom, 0px))' }}
        aria-label='Novo pagamento'
      >
        <Plus size={20} />
      </button>
    </div>
  )
}


