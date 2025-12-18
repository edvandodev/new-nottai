import React, { useMemo, useState } from 'react'
import { CheckCircle, ChevronDown, ChevronUp, FileText, Trash2, Wallet } from 'lucide-react'
import type { Payment, Sale } from '@/types'

const parseDate = (
  value: string | number | Date | { seconds?: number; nanoseconds?: number; toMillis?: () => number }
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
        (typeof value.nanoseconds === 'number' ? Math.floor(value.nanoseconds / 1_000_000) : 0)
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

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const formatDayLabel = (ts: number) => {
  const d = new Date(ts)
  const now = new Date()
  const startOfDay = (dt: Date) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime()
  const today = startOfDay(now)
  const target = startOfDay(d)
  const diff = today - target

  if (diff === 0) return 'HOJE'
  if (diff === 86_400_000) return 'ONTEM'

  const day = String(d.getDate()).padStart(2, '0')
  const month = MONTHS_SHORT[d.getMonth()]
  return `${day} ${month}`.toUpperCase()
}

type PaymentsPageProps = {
  payments: Payment[]
  onGenerateReceipt: (payment: Payment) => void
  onDeletePayment: (paymentId: string) => void
}

export function PaymentsPage({ payments, onGenerateReceipt, onDeletePayment }: PaymentsPageProps) {
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null)

  const sortedPayments = useMemo(
    () => [...payments].sort((a, b) => normalizeTs(b.date) - normalizeTs(a.date)),
    [payments]
  )

  const totalReceived = useMemo(
    () => payments.reduce((acc, p) => acc + (p.amount || 0), 0),
    [payments]
  )

  const groupedPayments = useMemo(() => {
    const groups: { label: string; items: Payment[] }[] = []
    sortedPayments.forEach((p) => {
      const ts = normalizeTs(p.date)
      const label = formatDayLabel(ts)
      const existing = groups.find((g) => g.label === label)
      if (existing) existing.items.push(p)
      else groups.push({ label, items: [p] })
    })
    return groups
  }, [sortedPayments])

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const togglePaymentExpand = (id: string) => {
    setExpandedPaymentId((prev) => (prev === id ? null : id))
  }

  return (
    <div className='space-y-4 animate-fade-in'>
      <div className='bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-md'>
        <h2 className='text-sm text-slate-400 mb-1'>Total Recebido (Histórico)</h2>
        <p className='text-3xl font-bold text-white'>{formatCurrency(totalReceived)}</p>
      </div>

      <h2 className='text-sm uppercase tracking-wider text-slate-500 font-semibold ml-1 pt-2'>
        Pagamentos Recentes
      </h2>

      {payments.length === 0 ? (
        <div className='text-center py-20 px-6 rounded-2xl bg-slate-900 border border-slate-800 border-dashed'>
          <Wallet size={48} className='mx-auto text-slate-700 mb-4' />
          <p className='text-slate-400 text-lg'>Nenhum pagamento registrado.</p>
          <p className='text-slate-600 text-sm mt-1'>Os pagamentos confirmados aparecerão aqui.</p>
        </div>
      ) : (
        <div className='space-y-4'>
          {groupedPayments.map((group) => (
            <div key={group.label} className='space-y-2'>
              <p className='text-xs font-semibold text-slate-500 uppercase tracking-wide ml-1'>
                {group.label}
              </p>
              <div className='space-y-3'>
                {group.items.map((payment) => {
                  const paymentDate = parseDate(payment.date as any)
                  const dateLabel = paymentDate?.toLocaleDateString('pt-BR') || 'Data indisponível'
                  const timeLabel =
                    paymentDate?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) || '--:--'

                  return (
                    <div
                      key={payment.id}
                      className='bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-sm transition-all'
                    >
                      <div
                        onClick={() => togglePaymentExpand(payment.id)}
                        className='p-4 flex justify-between items-center cursor-pointer hover:bg-slate-700/30 transition-colors'
                      >
                        <div className='flex gap-4 items-center'>
                          <div className='h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20'>
                            <CheckCircle size={20} />
                          </div>
                          <div>
                            <p className='text-white font-bold'>{payment.clientName}</p>
                            <p className='text-xs text-slate-500'>
                              {dateLabel} às {timeLabel}
                            </p>
                          </div>
                        </div>

                        <div className='text-right flex items-center gap-3'>
                          <span className='text-green-400 font-bold text-lg'>{formatCurrency(payment.amount)}</span>
                          {expandedPaymentId === payment.id ? (
                            <ChevronUp size={20} className='text-slate-500' />
                          ) : (
                            <ChevronDown size={20} className='text-slate-500' />
                          )}
                        </div>
                      </div>

                      {expandedPaymentId === payment.id && (
                        <div className='px-4 pb-4 pt-1 border-t border-slate-700/50 bg-slate-900/30 animate-fade-in'>
                          <div className='mt-3 mb-4 space-y-2'>
                            <h4 className='text-xs font-semibold text-slate-500 uppercase tracking-wide'>
                              Itens Pagos
                            </h4>

                            {payment.salesSnapshot && payment.salesSnapshot.length > 0 ? (
                              <div className='space-y-2'>
                                {payment.salesSnapshot.map((sale: Sale) => {
                                  const saleDate = parseDate(sale.date as any)
                                  const saleLabel = saleDate?.toLocaleDateString('pt-BR') || 'Data'
                                  return (
                                    <div
                                      key={sale.id}
                                      className='flex justify-between text-sm text-slate-300 border-b border-slate-700/50 pb-1.5 last:border-0'
                                    >
                                      <span>
                                        {saleLabel} - {sale.liters} {sale.liters === 1 ? 'Litro' : 'Litros'}
                                      </span>
                                      <span>{formatCurrency(sale.totalValue)}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <p className='text-sm text-slate-500 italic'>Detalhes não disponíveis para este registro.</p>
                            )}
                          </div>

                          <div className='flex gap-3'>
                            {payment.salesSnapshot && (
                              <button
                                onClick={() => void onGenerateReceipt(payment)}
                                className='flex-1 py-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 border border-blue-600/30 transition-colors'
                              >
                                <FileText size={16} />
                                Ver Comprovante PDF
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeletePayment(payment.id)
                              }}
                              className='px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/30'
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
    </div>
  )
}

