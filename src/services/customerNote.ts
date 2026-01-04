import type { Client, Payment, Sale } from '@/types'
import type { ReceiptFileRef } from './pdfGenerator'
import { generateNotaPdf, type NotePdfInput } from './pdfGenerator'

export type PeriodPreset = 'all' | 'today' | '7d' | '30d' | 'month' | 'custom'

const normalizeTimestamp = (
  value:
    | string
    | number
    | Date
    | { seconds?: number; nanoseconds?: number; toMillis?: () => number }
    | null
    | undefined
) => {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const t = new Date(value).getTime()
    return Number.isNaN(t) ? 0 : t
  }
  if (typeof value === 'object') {
    if (typeof value.toMillis === 'function') {
      const t = value.toMillis()
      return Number.isNaN(t) ? 0 : t
    }
    if (typeof value.seconds === 'number') {
      const millis =
        value.seconds * 1000 +
        (typeof value.nanoseconds === 'number'
          ? Math.floor(value.nanoseconds / 1_000_000)
          : 0)
      return millis
    }
  }
  return 0
}

const clampRange = (start?: number | null, end?: number | null) => {
  const safeStart = typeof start === 'number' && !Number.isNaN(start) ? start : 0
  const safeEnd = typeof end === 'number' && !Number.isNaN(end) ? end : Date.now()
  return [safeStart, safeEnd] as const
}

const startOfDay = (ts: number) => {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

const endOfDay = (ts: number) => startOfDay(ts) + 86_399_999

const resolvePendingBalance = (sales: Sale[], payments: Payment[]) => {
  const lastPaymentTs = payments.reduce((acc, p) => {
    const ts = normalizeTimestamp((p as any).createdAt ?? p.date)
    return ts > acc ? ts : acc
  }, 0)

  if (!lastPaymentTs) return 0

  const salesUpToLastPayment = sales.filter(
    (s) => normalizeTimestamp((s as any).createdAt ?? s.date) <= lastPaymentTs
  )
  const paymentsUpToLastPayment = payments.filter(
    (p) => normalizeTimestamp((p as any).createdAt ?? p.date) <= lastPaymentTs
  )

  const balanceAtLastPayment =
    salesUpToLastPayment.reduce((acc, s) => acc + (s.totalValue || 0), 0) -
    paymentsUpToLastPayment.reduce((acc, p) => acc + (p.amount || 0), 0)

  return Math.max(0, balanceAtLastPayment)
}

export const resolvePeriodRange = (
  preset: PeriodPreset,
  nowTs = Date.now(),
  customStart?: number | null,
  customEnd?: number | null
) => {
  const todayStart = startOfDay(nowTs)
  if (preset === 'today') return [todayStart, endOfDay(nowTs)] as const
  if (preset === '7d') return [todayStart - 6 * 86_400_000, endOfDay(nowTs)] as const
  if (preset === '30d') return [todayStart - 29 * 86_400_000, endOfDay(nowTs)] as const
  if (preset === 'month') {
    const d = new Date(nowTs)
    const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
    const end = endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0).getTime())
    return [start, end] as const
  }
  if (preset === 'custom') return clampRange(customStart, customEnd)
  return [0, Number.POSITIVE_INFINITY] as const
}

export const computeNoteData = (
  sales: Sale[],
  payments: Payment[],
  startDate?: number,
  endDate?: number
) => {
  const [start, end] = clampRange(startDate, endDate)

  const salesFiltered = sales.filter((s) => {
    const ts = normalizeTimestamp((s as any).createdAt ?? s.date)
    return ts >= start && ts <= end
  })

  const paymentsFiltered = payments.filter((p) => {
    const ts = normalizeTimestamp((p as any).createdAt ?? p.date)
    return ts >= start && ts <= end
  })

  const totalSales = salesFiltered.reduce((acc, s) => acc + (s.totalValue || 0), 0)
  const totalPaid = paymentsFiltered.reduce((acc, p) => acc + (p.amount || 0), 0)
  const totalLiters = salesFiltered.reduce((acc, s) => acc + (s.liters || 0), 0)
  const balance = totalSales - totalPaid

  return { salesFiltered, paymentsFiltered, totalSales, totalPaid, totalLiters, balance }
}

const buildNoteId = (clientId: string) => {
  const ts = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = ts.getFullYear()
  const m = pad(ts.getMonth() + 1)
  const d = pad(ts.getDate())
  const hh = pad(ts.getHours())
  const mm = pad(ts.getMinutes())
  const shortClient = clientId.slice(0, 6)
  return `NOTA-${y}${m}${d}-${hh}${mm}-${shortClient}`
}

type PdfOptions = {
  periodLabel: string
  includeDetails: boolean
  customNoteId?: string
  emittedAt?: Date
  pricePerLiter?: number
}

export const generateCustomerNotePdf = async (
  client: Client,
  noteData: ReturnType<typeof computeNoteData>,
  options: PdfOptions
): Promise<ReceiptFileRef> => {
  const emittedAt = options.emittedAt || new Date()
  const noteId = options.customNoteId || buildNoteId(client.id)
  const pendingBalance = resolvePendingBalance(noteData.salesFiltered, noteData.paymentsFiltered)
  const payload: NotePdfInput = {
    clientName: client.name,
    noteId,
    periodLabel: options.periodLabel,
    emittedAt,
    totalSales: noteData.totalSales,
    totalPaid: noteData.totalPaid,
    balance: noteData.balance,
    pendingBalance,
    totalLiters: noteData.totalLiters,
    includeDetails: options.includeDetails,
    sales: noteData.salesFiltered,
    payments: noteData.paymentsFiltered,
    pricePerLiter: options.pricePerLiter
  }

  return generateNotaPdf(payload)
}

