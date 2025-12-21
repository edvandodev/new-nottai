import { jsPDF } from 'jspdf'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'
import type { Client, Payment, Sale } from '@/types'
import type { ReceiptFileRef } from './pdfGenerator'

export type PeriodPreset = 'all' | 'today' | '7d' | '30d' | 'month' | 'custom'

const toBase64 = async (blob: Blob) => {
  const buffer = await blob.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buffer)
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary)
}

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

const formatCurrency = (val: number) =>
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const formatDateTime = (value: string | number | Date) => {
  const d = new Date(value)
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })}`
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
}

export const generateCustomerNotePdf = async (
  client: Client,
  noteData: ReturnType<typeof computeNoteData>,
  options: PdfOptions
): Promise<ReceiptFileRef> => {
  const emittedAt = options.emittedAt || new Date()
  const doc = new jsPDF({ unit: 'mm', format: [148, 263] })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 16
  let y = 18

  const title = 'Nottai — Nota / Extrato do Cliente'
  const noteId = options.customNoteId || buildNoteId(client.id)

  doc.setFillColor(17, 24, 39)
  doc.rect(0, 0, pageWidth, 36, 'F')
  doc.setTextColor(184, 255, 44)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Nottai', margin, y)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.text('Nota / Extrato do Cliente', pageWidth / 2, y, { align: 'center' })
  doc.setFontSize(10)
  doc.text(noteId, pageWidth - margin, y, { align: 'right' })

  y += 14
  doc.setDrawColor(40, 48, 60)
  doc.line(margin, y, pageWidth - margin, y)
  y += 10

  doc.setTextColor(40, 40, 40)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Cliente', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.text(client.name, margin, y + 6)
  let clientInfoLines = [`Emitido em: ${formatDateTime(emittedAt)}`]
  clientInfoLines.push(`Período: ${options.periodLabel}`)
  if (client.phone) clientInfoLines.push(`Telefone: ${client.phone}`)
  doc.text(clientInfoLines, margin, y + 14)

  y += 30
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.4)
  doc.roundedRect(margin, y, pageWidth - margin * 2, 38, 3, 3, 'S')
  doc.setFontSize(11)
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumo', margin + 4, y + 8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Total de Vendas: ${formatCurrency(noteData.totalSales)}`, margin + 4, y + 18)
  doc.text(`Total Pago: ${formatCurrency(noteData.totalPaid)}`, margin + 4, y + 26)
  doc.text(`Saldo Atual: ${formatCurrency(noteData.balance)}`, margin + 4, y + 34)
  if (noteData.totalLiters) {
    doc.text(`Total de Litros: ${noteData.totalLiters.toFixed(2)} L`, pageWidth - margin - 4, y + 18, {
      align: 'right'
    })
  }

  y += 46
  const withDetails = options.includeDetails
  if (withDetails) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40, 40, 40)
    doc.text('Vendas', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    if (noteData.salesFiltered.length === 0) {
      doc.text('Sem vendas no período.', margin, y)
      y += 10
    } else {
      noteData.salesFiltered.forEach((s) => {
        const ts = (s as any).createdAt ?? s.date
        const dateStr = formatDateTime(ts as any)
        doc.text(dateStr, margin, y)
        doc.text(`${(s.liters || 0).toFixed(2)} L`, pageWidth / 2, y)
        doc.text(formatCurrency(s.totalValue || 0), pageWidth - margin, y, { align: 'right' })
        y += 7
      })
      y += 4
    }

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40, 40, 40)
    doc.text('Pagamentos', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    if (noteData.paymentsFiltered.length === 0) {
      doc.text('Sem pagamentos no período.', margin, y)
      y += 10
    } else {
      noteData.paymentsFiltered.forEach((p) => {
        const ts = (p as any).createdAt ?? p.date
        const dateStr = formatDateTime(ts as any)
        doc.text(dateStr, margin, y)
        doc.text(formatCurrency(p.amount || 0), pageWidth - margin, y, { align: 'right' })
        y += 7
      })
      y += 4
    }
  }

  y += 10
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 10
  doc.setFontSize(10)
  doc.setTextColor(120, 120, 120)
  doc.setFont('helvetica', 'italic')
  doc.text('Documento gerado pelo Nottai', pageWidth / 2, y, { align: 'center' })

  const pdfBlob = doc.output('blob')
  const mimeType = 'application/pdf'
  const fileName = `${noteId}.pdf`
  const isNative = Capacitor.isNativePlatform?.() ?? false

  if (!isNative) {
    const uri = URL.createObjectURL(pdfBlob)
    return { source: 'web', uri, fileName, mimeType }
  }

  const base64 = await toBase64(pdfBlob)
  const savePath = `notes/${fileName}`
  const saveDirectory: Directory = Directory.Documents

  await Filesystem.writeFile({
    path: savePath,
    data: base64,
    directory: saveDirectory,
    recursive: true
  })

  const uri = await Filesystem.getUri({ path: savePath, directory: saveDirectory })

  return {
    source: 'native',
    directory: saveDirectory,
    path: savePath,
    uri: uri.uri ?? null,
    fileName,
    mimeType,
    base64
  }
}
