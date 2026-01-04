import { jsPDF } from 'jspdf'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { FileOpener } from '@capawesome-team/capacitor-file-opener'
import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'
import type { Payment, Sale } from '@/types'

const PAGE_WIDTH = 148 // mm (mantÃ©m largura do mock)
const MIN_HEIGHT = 263 // altura mÃ­nima padrÃ£o para recibos curtos

const toBase64 = async (blob: Blob) => {
  const buffer = await blob.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buffer)
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary)
}

const dataUrlCache = new Map<string, string>()

const toDataUrl = async (src: string) => {
  if (!src) return null
  const cached = dataUrlCache.get(src)
  if (cached) return cached
  try {
    const res = await fetch(src)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const base64 = await toBase64(blob)
    const mime = blob.type || 'image/png'
    const dataUrl = `data:${mime};base64,${base64}`
    dataUrlCache.set(src, dataUrl)
    return dataUrl
  } catch (err) {
    console.warn('Falha ao carregar asset do comprovante', src, err)
    return null
  }
}

const fmtMoney = (val: number) =>
  (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const fmtDateLong = (iso: string) => {
  const dt = new Date(iso)
  const dateStr = dt.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
  const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${dateStr.charAt(0).toUpperCase()}${dateStr.slice(1)} \u00e0s ${timeStr}`
}
const loadImageSize = async (dataUrl: string | null) => {
  return new Promise<{ w: number; h: number }>((resolve) => {
    if (!dataUrl) {
      resolve({ w: 1, h: 1 })
      return
    }
    try {
      const img = new Image()
      img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 })
      img.onerror = () => resolve({ w: 1, h: 1 })
      img.src = dataUrl
    } catch {
      resolve({ w: 1, h: 1 })
    }
  })
}

const fitIntoBox = (imgW: number, imgH: number, maxW: number, maxH: number) => {
  const scale = Math.min(maxW / imgW, maxH / imgH, 1)
  return { drawW: imgW * scale, drawH: imgH * scale }
}

const getSaleUnitPrice = (sale: Sale): number => {
  if (typeof sale.pricePerLiter === 'number' && sale.pricePerLiter > 0) {
    return sale.pricePerLiter
  }
  const liters = sale.liters ?? 0
  if (liters > 0) {
    return (sale.totalValue || 0) / liters
  }
  return 0
}

const logoSrc = new URL('../../assets/comprovante/logo.png', import.meta.url).toString()
const illustrationSrc = new URL('../../assets/comprovante/ilustracao.png', import.meta.url).toString()
const illustrationNoteSrc = new URL(
  '../../assets/comprovante/ilustracao-nota.png',
  import.meta.url
).toString()

type LayoutConstants = {
  MARGIN_X: number
  CONTENT_W: number
  RIGHT_X: number
  RIGHT_PAD: number
  PAD: number
  GAP_SM: number
  GAP_MD: number
  GAP_LG: number
  headerHeight: number
  listHeaderHeight: number
  itemMinHeight: number
  totalBarHeight: number
  footerHeight: number
  bottomMargin: number
}

const LAYOUT: LayoutConstants = {
  MARGIN_X: 14,
  CONTENT_W: PAGE_WIDTH - 14 * 2,
  RIGHT_X: PAGE_WIDTH - 14,
  RIGHT_PAD: 8,
  PAD: 8,
  GAP_SM: 6,
  GAP_MD: 10,
  GAP_LG: 14,
  headerHeight: 42,
  listHeaderHeight: 15,
  itemMinHeight: 20,
  totalBarHeight: 18,
  footerHeight: 12,
  bottomMargin: 14
}

// MediÃ§Ã£o do conteÃºdo para calcular altura final (sem addPage)
const GAP_AFTER_PAYER = 0.5 // mm
const TABLE_HEADER_HEIGHT = 12 // mm
const TABLE_HEADER_GAP = 6 // mm
const ITEM_ROW_BASE_H = 12 // mm
const ITEM_NAME_OFFSET = 4 // mm from row top
const ITEM_DATE_OFFSET = 6 // mm below last name line
const ITEM_BOTTOM_PAD = 1 // mm padding before divider

const measureReceiptHeight = (
  doc: jsPDF,
  salesPaid: Sale[],
  clientName: string
): number => {
  const { MARGIN_X, CONTENT_W, RIGHT_X, PAD, GAP_SM, GAP_MD, GAP_LG, headerHeight, itemMinHeight, totalBarHeight, footerHeight, bottomMargin } =
    LAYOUT

  let y = headerHeight + GAP_LG

  // TÃ­tulo e data
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  y += doc.getTextDimensions('Comprovante de pagamento').h + GAP_SM
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  y += doc.getTextDimensions('data').h // approx height

  // Pagador
  y += GAP_MD
  const labelSize = 9
  const valueSize = 18
  const labelGap = 2
  const leftMaxWidth = Math.max(20, CONTENT_W * 0.62)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(valueSize)
  const payerLineHeight = doc.getTextDimensions('Ag').h
  const payerLines = doc.splitTextToSize(clientName || 'Cliente', leftMaxWidth)
  const payerBlockH = payerLineHeight * payerLines.length
  const amountHeight = doc.getTextDimensions('R$ 0,00').h
  const payerEndY = y + labelSize + labelGap + Math.max(payerBlockH, amountHeight)

  // Header da lista
  y = payerEndY + GAP_AFTER_PAYER
  y += TABLE_HEADER_HEIGHT + TABLE_HEADER_GAP

  // Itens
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  const itemLineH = doc.getTextDimensions('Ag').h
  const itemDateH = doc.getTextDimensions('00/00/0000').h
  salesPaid.forEach((sale) => {
    const textX = MARGIN_X + PAD
    const maxTextWidth = RIGHT_X - PAD - textX
    const title = `Leite (${sale.liters || 0}L)`
    const titleLines = doc.splitTextToSize(title, maxTextWidth)
    const extraH = Math.max(0, titleLines.length - 1) * itemLineH
    const contentH =
      ITEM_NAME_OFFSET +
      titleLines.length * itemLineH +
      ITEM_DATE_OFFSET +
      itemDateH +
      ITEM_BOTTOM_PAD
    const rowH = Math.max(ITEM_ROW_BASE_H + extraH, contentH)
    y += rowH
  })

  // Total + rodapÃ© + margem inferior
  y += GAP_MD + totalBarHeight + GAP_SM + footerHeight + bottomMargin

  return Math.max(y, MIN_HEIGHT)
}

const buildReceiptDoc = async (
  clientName: string,
  amount: number,
  salesPaid: Sale[],
  paymentDate: string
) => {
  // Passo 1: medir altura
  const tempDoc = new jsPDF({ unit: 'mm', format: [PAGE_WIDTH, MIN_HEIGHT] })
  const measuredHeight = measureReceiptHeight(tempDoc, salesPaid, clientName)
  const finalHeight = Math.max(measuredHeight, MIN_HEIGHT)

  // Passo 2: criar doc real com altura dinÃ¢mica
  const doc = new jsPDF({ unit: 'mm', format: [PAGE_WIDTH, finalHeight] })
  const {
    MARGIN_X,
    CONTENT_W,
    RIGHT_X,
    RIGHT_PAD,
    PAD,
    GAP_SM,
    GAP_MD,
    GAP_LG,
    headerHeight,
    itemMinHeight,
    totalBarHeight,
    footerHeight,
    bottomMargin
  } = LAYOUT

  const logoData = await toDataUrl(logoSrc)
  const illustrationData = await toDataUrl(illustrationSrc)
  const logoSize = await loadImageSize(logoData)
  const illustrationSize = await loadImageSize(illustrationData)

  const drawHeader = () => {
    doc.setFillColor(12, 15, 23)
    doc.rect(0, 0, pageWidth, headerHeight, 'F')

    const paddingX = 12
    const paddingY = 6
    const logoBoxW = pageWidth * 0.55
    const logoBoxH = headerHeight - paddingY * 2
    const illuBoxW = pageWidth * 0.35
    const illuBoxH = headerHeight - paddingY * 2

    if (logoData) {
      const { drawW, drawH } = fitIntoBox(logoSize.w, logoSize.h, logoBoxW, logoBoxH)
      const logoX = paddingX
      const logoY = paddingY + (logoBoxH - drawH) / 2
      doc.addImage(logoData, 'PNG', logoX, logoY, drawW, drawH)
    }

    if (illustrationData) {
      const { drawW, drawH } = fitIntoBox(illustrationSize.w, illustrationSize.h, illuBoxW, illuBoxH)
      const illuX = pageWidth - paddingX - drawW
      const illuY = paddingY + (illuBoxH - drawH) / 2
      doc.addImage(illustrationData, 'PNG', illuX, illuY, drawW, drawH)
    }
  }

  let yPos = headerHeight + GAP_LG

  const drawTitleAndDate = () => {
    doc.setTextColor(12, 15, 23)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('Comprovante de pagamento', MARGIN_X, yPos)

    yPos += GAP_SM
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(85, 85, 85)
    doc.text(fmtDateLong(paymentDate), MARGIN_X, yPos)
    doc.setTextColor(12, 15, 23)
  }

  const drawPayerSection = () => {
    // espaÃ§amento antes
    yPos += GAP_MD

    const xLeft = MARGIN_X
    const xRight = RIGHT_X - RIGHT_PAD
    const leftMaxWidth = Math.max(20, CONTENT_W * 0.62)

    const labelSize = 9
    const valueSize = 18
    const labelGap = 2
    const labelColor: [number, number, number] = [102, 102, 102]

    const yLabel = yPos
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(labelSize)
    doc.setTextColor(...labelColor)
    doc.text('PAGADOR:', xLeft, yLabel)
    doc.text('VALOR PAGO:', xRight, yLabel, { align: 'right' })

    const yValue = yLabel + labelSize + labelGap
    const payerLines = doc.splitTextToSize(clientName || 'Cliente', leftMaxWidth)
    const payerLineHeight = doc.getTextDimensions('Ag').h

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(valueSize)
    doc.setTextColor(104, 159, 30)
    payerLines.forEach((line, idx) => {
      const lineY = yValue + payerLineHeight * idx
      doc.text(line, xLeft, lineY)
    })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(valueSize)
    doc.setTextColor(12, 15, 23)
    doc.text(fmtMoney(amount), xRight, yValue, { align: 'right' })

    const payerBlockH = payerLines.length * payerLineHeight
    const amountHeight = doc.getTextDimensions(fmtMoney(amount)).h
    const blockH = Math.max(payerBlockH, amountHeight)
    const payerEndY = yValue + blockH
    yPos = payerEndY + GAP_AFTER_PAYER
  }

  const drawTableHeader = () => {
    const headerH = TABLE_HEADER_HEIGHT
    const headerPad = 6

    doc.setFillColor(240, 240, 240)
    doc.roundedRect(MARGIN_X, yPos, CONTENT_W, headerH, 3, 3, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(30, 30, 30)
    const textY = yPos + headerH / 2
    doc.text('Descri\u00e7\u00e3o / Data da Compra', MARGIN_X + headerPad, textY, { baseline: 'middle' })
    doc.text('Valor', MARGIN_X + CONTENT_W - headerPad, textY, {
      align: 'right',
      baseline: 'middle'
    })

    const dividerY = yPos + headerH
    doc.setDrawColor(234, 236, 240)
    doc.setLineWidth(0.2)
    doc.line(MARGIN_X, dividerY, pageWidth - MARGIN_X, dividerY)

    yPos += headerH + TABLE_HEADER_GAP
  }

  const drawItemRow = (item: Sale) => {
    const textX = MARGIN_X + PAD
    const maxTextWidth = RIGHT_X - PAD - textX
    const title = `Leite (${item.liters || 0}L)`
    const titleLines = doc.splitTextToSize(title, maxTextWidth)
    const lineHeight = doc.getTextDimensions('Ag').h
    const extraH = Math.max(0, titleLines.length - 1) * lineHeight
    const dateStr = item.date ? new Date(item.date as any).toLocaleDateString('pt-BR') : ''
    const dateHeight = dateStr ? doc.getTextDimensions(dateStr).h : doc.getTextDimensions('00/00/0000').h
    const contentH =
      ITEM_NAME_OFFSET +
      titleLines.length * lineHeight +
      ITEM_DATE_OFFSET +
      dateHeight +
      ITEM_BOTTOM_PAD
    const rowH = Math.max(ITEM_ROW_BASE_H + extraH, contentH)
    const nameYStart = yPos + ITEM_NAME_OFFSET
    const dateY = nameYStart + lineHeight * (titleLines.length - 1) + ITEM_DATE_OFFSET

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(12, 15, 23)
    titleLines.forEach((line, idx) => {
      const lineY = nameYStart + lineHeight * idx
      doc.text(line, textX, lineY, { baseline: 'top' })
    })

    const valueY = nameYStart
    doc.text(fmtMoney(item.totalValue || 0), RIGHT_X - PAD / 2, valueY, {
      align: 'right',
      baseline: 'top'
    })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(100, 102, 108)
    doc.text(dateStr, textX, dateY, { baseline: 'top' })

    yPos += rowH
    doc.setDrawColor(230, 232, 236)
    doc.setLineWidth(0.2)
    doc.line(MARGIN_X, yPos, pageWidth - MARGIN_X, yPos)
  }

  const drawTotalBar = (total: number) => {
    yPos += GAP_MD
    doc.setFillColor(184, 255, 44)
    doc.roundedRect(MARGIN_X, yPos, CONTENT_W, totalBarHeight, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(12, 15, 23)
    const totalTextY = yPos + totalBarHeight / 2
    doc.text('TOTAL', MARGIN_X + PAD, totalTextY, { baseline: 'middle' })
    doc.text(fmtMoney(total), RIGHT_X - PAD, totalTextY, { align: 'right', baseline: 'middle' })
    yPos += totalBarHeight + GAP_SM
  }

  const drawFooter = (createdAt: Date, receiptId: string) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 102, 108)
    const createdStr = createdAt.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    const createdTime = createdAt.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
    doc.text(`Gerado em: ${createdStr} Ã s ${createdTime}`, MARGIN_X, yPos + 4)
    doc.text(`ID do comprovante: ${receiptId}`, MARGIN_X, yPos + 9)
    yPos += footerHeight
  }

  const pageWidth = doc.internal.pageSize.getWidth()

  drawHeader()
  drawTitleAndDate()
  drawPayerSection()
  drawTableHeader()
  salesPaid.forEach((sale) => drawItemRow(sale))

  const receiptId = `#${Math.random().toString(16).slice(2, 10).toUpperCase()}`
  const createdAt = new Date()

  drawTotalBar(amount)

  // Se faltar espaÃ§o para o rodapÃ©, apenas desloca para nÃ£o ficar colado na margem
  const remaining = finalHeight - yPos - footerHeight - bottomMargin
  if (remaining > 0) {
    yPos += Math.min(remaining, GAP_MD)
  }
  drawFooter(createdAt, receiptId)

  const fileName = `Comprovante_${clientName.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`
  return { doc, fileName }
}

export const generateReceiptFile = async (
  clientName: string,
  amount: number,
  salesPaid: Sale[],
  paymentDate: string
) => {
  const { doc, fileName } = await buildReceiptDoc(clientName, amount, salesPaid, paymentDate)
  const pdfBlob = doc.output('blob')
  const base64 = await toBase64(pdfBlob)
  const savePath = `receipts/${fileName}`
  const saveDirectory: Directory = Directory.Documents

  await Filesystem.writeFile({
    path: savePath,
    data: base64,
    directory: saveDirectory,
    recursive: true
  })

  const uri = await Filesystem.getUri({
    path: savePath,
    directory: saveDirectory
  })

  return { base64, path: savePath, uri: uri.uri ?? null, fileName }
}

export type ReceiptFileRef = {
  source: 'native' | 'web'
  directory?: Directory
  path?: string
  uri: string | null
  fileName: string
  mimeType: string
  base64?: string
  blob?: Blob
}

export const createReceiptFile = async (
  clientName: string,
  amount: number,
  salesPaid: Sale[],
  paymentDate: string
): Promise<ReceiptFileRef> => {
  const { doc, fileName } = await buildReceiptDoc(clientName, amount, salesPaid, paymentDate)
  const pdfBlob = doc.output('blob')
  const mimeType = 'application/pdf'
  const isNative = Capacitor.isNativePlatform?.() ?? false

  if (!isNative) {
    const blobUrl = URL.createObjectURL(pdfBlob)
    return { source: 'web', uri: blobUrl, fileName, mimeType, blob: pdfBlob }
  }

  const base64 = await toBase64(pdfBlob)
  const savePath = `receipts/${fileName}`
  const saveDirectory: Directory = Directory.Documents

  await Filesystem.writeFile({
    path: savePath,
    data: base64,
    directory: saveDirectory,
    recursive: true
  })

  const uri = await Filesystem.getUri({
    path: savePath,
    directory: saveDirectory
  })

  return {
    source: 'native',
    directory: saveDirectory,
    path: savePath,
    uri: uri.uri ?? null,
    fileName,
    mimeType,
    base64,
    blob: pdfBlob
  }
}

type NoteListRow = {
  title: string
  meta?: string
  valueLabel: string
  ts?: number
  isDetail?: boolean
}

export type NotePdfInput = {
  clientName: string
  noteId: string
  periodLabel: string
  emittedAt: Date
  balance: number
  pendingBalance?: number
  totalLiters?: number
  includeDetails: boolean
  sales?: Sale[]
  payments?: Payment[]
  pricePerLiter?: number
}

const extractTimestamp = (
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

const formatNoteMeta = (value: any) => {
  const ts = extractTimestamp(value)
  if (!ts) return ''
  const d = new Date(ts)
  const date = d.toLocaleDateString('pt-BR')
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${date} ${time}`
}

const formatDateShort = (ts: number) => {
  if (!ts) return ''
  const d = new Date(ts)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

const getSalesAfterLastPayment = (sales: Sale[] = [], payments: Payment[] = []) => {
  const lastPaymentTs = payments.reduce((acc, p) => {
    const ts = extractTimestamp((p as any).createdAt ?? p.date)
    return ts > acc ? ts : acc
  }, 0)

  const filteredSales =
    lastPaymentTs > 0
      ? sales.filter((s) => extractTimestamp((s as any).createdAt ?? s.date) > lastPaymentTs)
      : sales

  return { lastPaymentTs, filteredSales }
}

type FilteredNoteData = {
  lastPaymentTs: number
  filteredSales: Sale[]
  paymentsAfterLast: Payment[]
  filteredTotal: number
  filteredLiters: number
}

const resolvePeriodRow = (data: NotePdfInput, filtered: FilteredNoteData): NoteListRow => {
  const payments = data.payments || []
  const sales = data.sales || []
  const { lastPaymentTs, filteredSales } = filtered

  let meta = ''
  if (lastPaymentTs > 0 && filteredSales.length === 0) {
    meta = 'Sem compras após o último pagamento'
  } else if (filteredSales.length > 0) {
    const timestamps = filteredSales.map((s) => extractTimestamp((s as any).createdAt ?? s.date)).filter(Boolean)
    const startTs = Math.min(...timestamps)
    const endTs = Math.max(...timestamps)
    meta = `De ${formatDateShort(startTs)} a ${formatDateShort(endTs)}`
  } else if (sales.length === 0) {
    meta = 'Sem compras registradas'
  } else {
    const timestamps = sales.map((s) => extractTimestamp((s as any).createdAt ?? s.date)).filter(Boolean)
    const startTs = Math.min(...timestamps)
    const endTs = Math.max(...timestamps)
    meta = `De ${formatDateShort(startTs)} a ${formatDateShort(endTs)}`
  }

  return {
    title: 'Período',
    meta,
    valueLabel: ''
  }
}

const buildNoteRows = (data: NotePdfInput): NoteListRow[] => {
  const payments = data.payments || []
  const sales = data.sales || []
  const { lastPaymentTs, filteredSales } = getSalesAfterLastPayment(sales, payments)
  const paymentsAfterLast = payments.filter(
    (payment) => extractTimestamp((payment as any).createdAt ?? payment.date) > lastPaymentTs
  )
  const filteredTotal = filteredSales.reduce((acc, s) => acc + (s.totalValue || 0), 0)
  const filteredLiters = filteredSales.reduce((acc, s) => acc + (s.liters || 0), 0)
  const filteredData: FilteredNoteData = {
    lastPaymentTs,
    filteredSales,
    paymentsAfterLast,
    filteredTotal,
    filteredLiters
  }

  const rows: NoteListRow[] = [
    resolvePeriodRow(data, filteredData),
    {
      title: 'Saldo atual',
      meta: 'Vendas - pagamentos',
      valueLabel: fmtMoney(filteredTotal || 0)
    }
  ]

  if ((data.pendingBalance || 0) > 0) {
    rows.push({
      title: 'Saldo pendente',
      meta: 'Pendências em aberto',
      valueLabel: fmtMoney(data.pendingBalance || 0)
    })
  }

  if (filteredLiters) {
    rows.push({
      title: 'Total de litros',
      meta: 'Volume vendido',
      valueLabel: `${(filteredLiters || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      })} L`
    })
  }

  if (data.includeDetails) {
    const detailItems: NoteListRow[] = []
      filteredData.filteredSales.forEach((sale) => {
        const liters = sale.liters || 0
        const litersLabel = liters.toLocaleString('pt-BR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        })
        const unitPriceText = fmtMoney(getSaleUnitPrice(sale))
        detailItems.push({
          title: `${litersLabel} Litros - ${unitPriceText}`,
          meta: formatNoteMeta((sale as any).createdAt ?? sale.date),
          valueLabel: fmtMoney(sale.totalValue || 0),
          ts: extractTimestamp((sale as any).createdAt ?? sale.date),
          isDetail: true
        })
      })
    filteredData.paymentsAfterLast.forEach((payment) => {
      detailItems.push({
        title: payment.note ? `Pagamento - ${payment.note}` : 'Pagamento recebido',
        meta: formatNoteMeta((payment as any).createdAt ?? payment.date),
        valueLabel: fmtMoney(payment.amount || 0),
        ts: extractTimestamp((payment as any).createdAt ?? payment.date)
      })
    })

    detailItems
      .sort((a, b) => (b.ts || 0) - (a.ts || 0))
      .forEach((item) => rows.push(item))
  }

  return rows
}

const measureNoteHeight = (
  doc: jsPDF,
  rows: NoteListRow[],
  clientName: string,
  hasPeriodLine: boolean,
  unitPrice: number
): number => {
  const {
    MARGIN_X,
    CONTENT_W,
    RIGHT_X,
    PAD,
    GAP_SM,
    GAP_MD,
    GAP_LG,
    headerHeight,
    totalBarHeight,
    footerHeight,
    bottomMargin
  } = LAYOUT

  let y = headerHeight + GAP_LG

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  y += doc.getTextDimensions('Nota de pagamento').h + GAP_SM
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  y += doc.getTextDimensions('data').h
  if (hasPeriodLine) {
    y += doc.getTextDimensions('Per\u00edodo').h
  }

  y += GAP_MD
  const xLeft = MARGIN_X
  const leftMaxWidth = Math.max(20, CONTENT_W * 0.62)

  const labelSize = 9
  const valueSize = 18
  const labelGap = 2

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(valueSize)
  const payerLineHeight = doc.getTextDimensions('Ag').h
  const payerLines = doc.splitTextToSize(clientName || 'Cliente', leftMaxWidth)
  const payerBlockH = payerLineHeight * payerLines.length
  const unitPriceText = fmtMoney(unitPrice)
  const unitPriceHeight = doc.getTextDimensions(unitPriceText).h
  const valueRowH = Math.max(payerBlockH, unitPriceHeight)
  const payerEndY = y + labelSize + labelGap + valueRowH

  y = payerEndY + GAP_AFTER_PAYER
  y += TABLE_HEADER_HEIGHT + TABLE_HEADER_GAP

  rows.forEach((row) => {
    const textX = MARGIN_X + PAD
    const maxTextWidth = RIGHT_X - PAD - textX
    const titleFontSize = row.isDetail ? 13 : 14
    const titleFontWeight = row.isDetail ? 'normal' : 'bold'
    doc.setFont('helvetica', titleFontWeight)
    doc.setFontSize(titleFontSize)
    const titleLines = doc.splitTextToSize(row.title || '', maxTextWidth)
    const lineHeight = doc.getTextDimensions('Ag').h
    const extraH = Math.max(0, titleLines.length - 1) * lineHeight
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    const metaText = row.meta || ''
    const metaHeight = metaText
      ? doc.getTextDimensions(metaText).h
      : doc.getTextDimensions('00/00/0000').h
    const contentH =
      ITEM_NAME_OFFSET +
      titleLines.length * lineHeight +
      ITEM_DATE_OFFSET +
      metaHeight +
      ITEM_BOTTOM_PAD
    const rowH = Math.max(ITEM_ROW_BASE_H + extraH, contentH)
    y += rowH
  })

  y += GAP_MD + totalBarHeight + GAP_SM + footerHeight + bottomMargin

  return Math.max(y, MIN_HEIGHT)
}

const buildNoteDoc = async (data: NotePdfInput) => {
  const payments = data.payments || []
  const sales = data.sales || []
  const { filteredSales } = getSalesAfterLastPayment(sales, payments)
  const filteredTotal = filteredSales.reduce((acc, s) => acc + (s.totalValue || 0), 0)
  const filteredLiters = filteredSales.reduce((acc, s) => acc + (s.liters || 0), 0)
  const pendingBalance = Math.max(0, data.pendingBalance || 0)
  const totalWithPending = filteredTotal + pendingBalance
  const rows = buildNoteRows(data)
  const hasPeriodLine = Boolean(data.periodLabel)
  const salesList = sales
  const totalLitersForCalc = salesList.reduce((acc, sale) => acc + (sale.liters ?? 0), 0)
  const litersToUse = data.totalLiters && data.totalLiters > 0 ? data.totalLiters : totalLitersForCalc
  const weightedPriceSum = salesList.reduce((acc, sale) => {
    const liters = sale.liters ?? 0
    if (!liters) return acc
    return acc + getSaleUnitPrice(sale) * liters
  }, 0)
  const configuredPrice =
    typeof data.pricePerLiter === 'number' ? data.pricePerLiter : undefined
  const unitPrice =
    typeof configuredPrice === 'number'
      ? configuredPrice
      : litersToUse > 0
        ? weightedPriceSum / litersToUse
        : 0
  const tempDoc = new jsPDF({ unit: 'mm', format: [PAGE_WIDTH, MIN_HEIGHT] })
  const measuredHeight = measureNoteHeight(
    tempDoc,
    rows,
    data.clientName,
    hasPeriodLine,
    unitPrice
  )
  const finalHeight = Math.max(measuredHeight, MIN_HEIGHT)

  const doc = new jsPDF({ unit: 'mm', format: [PAGE_WIDTH, finalHeight] })
  const {
    MARGIN_X,
    CONTENT_W,
    RIGHT_X,
    RIGHT_PAD,
    PAD,
    GAP_SM,
    GAP_MD,
    GAP_LG,
    headerHeight,
    totalBarHeight,
    footerHeight,
    bottomMargin
  } = LAYOUT

  const logoData = await toDataUrl(logoSrc)
  const illustrationData = await toDataUrl(illustrationNoteSrc)
  const logoSize = await loadImageSize(logoData)
  const illustrationSize = await loadImageSize(illustrationData)

  const drawHeader = () => {
    doc.setFillColor(12, 15, 23)
    doc.rect(0, 0, pageWidth, headerHeight, 'F')

    const paddingX = 12
    const paddingY = 6
    const logoBoxW = pageWidth * 0.55
    const logoBoxH = headerHeight - paddingY * 2
    const illuBoxW = pageWidth * 0.35
    const illuBoxH = headerHeight - paddingY * 2

    if (logoData) {
      const { drawW, drawH } = fitIntoBox(logoSize.w, logoSize.h, logoBoxW, logoBoxH)
      const logoX = paddingX
      const logoY = paddingY + (logoBoxH - drawH) / 2
      doc.addImage(logoData, 'PNG', logoX, logoY, drawW, drawH)
    }

    if (illustrationData) {
      const { drawW, drawH } = fitIntoBox(illustrationSize.w, illustrationSize.h, illuBoxW, illuBoxH)
      const illuX = pageWidth - paddingX - drawW
      const illuY = paddingY + (illuBoxH - drawH) / 2
      doc.addImage(illustrationData, 'PNG', illuX, illuY, drawW, drawH)
    }
  }

  let yPos = headerHeight + GAP_LG

  const drawTitleAndDate = () => {
    doc.setTextColor(12, 15, 23)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text('Nota de pagamento', MARGIN_X, yPos)

    yPos += GAP_SM
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(85, 85, 85)
    doc.text(fmtDateLong(data.emittedAt.toISOString()), MARGIN_X, yPos)
    if (data.periodLabel) {
      yPos += doc.getTextDimensions('data').h
      doc.text(`Per\u00edodo: ${data.periodLabel}`, MARGIN_X, yPos)
    }
    doc.setTextColor(12, 15, 23)
  }

  const drawPayerSection = () => {
    yPos += GAP_MD

    const xLeft = MARGIN_X
    const xRight = RIGHT_X - RIGHT_PAD
    const leftMaxWidth = Math.max(20, CONTENT_W * 0.62)

    const labelSize = 9
    const valueSize = 18
    const labelGap = 2
    const labelColor: [number, number, number] = [102, 102, 102]

    const yLabel = yPos
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(labelSize)
    doc.setTextColor(...labelColor)
    doc.text('CLIENTE:', xLeft, yLabel)
    doc.text('VALOR DO LITRO:', xRight, yLabel, { align: 'right' })

    const yValue = yLabel + labelSize + labelGap
    const payerLines = doc.splitTextToSize(data.clientName || 'Cliente', leftMaxWidth)
    const payerLineHeight = doc.getTextDimensions('Ag').h

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(valueSize)
    doc.setTextColor(104, 159, 30)
    payerLines.forEach((line, idx) => {
      const lineY = yValue + payerLineHeight * idx
      doc.text(line, xLeft, lineY)
    })

    const unitPriceText = fmtMoney(unitPrice)
    doc.text(unitPriceText, xRight, yValue, { align: 'right' })

    const payerBlockH = payerLines.length * payerLineHeight
    const valueHeight = doc.getTextDimensions(unitPriceText).h
    const valueRowH = Math.max(payerBlockH, valueHeight)
    yPos = yValue + valueRowH + GAP_AFTER_PAYER
  }

  const drawTableHeader = () => {
    const headerH = TABLE_HEADER_HEIGHT
    const headerPad = 6

    doc.setFillColor(240, 240, 240)
    doc.roundedRect(MARGIN_X, yPos, CONTENT_W, headerH, 3, 3, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(30, 30, 30)
    const textY = yPos + headerH / 2
    doc.text('Descri\u00e7\u00e3o / Data', MARGIN_X + headerPad, textY, { baseline: 'middle' })
    doc.text('Valor', MARGIN_X + CONTENT_W - headerPad, textY, {
      align: 'right',
      baseline: 'middle'
    })

    const dividerY = yPos + headerH
    doc.setDrawColor(234, 236, 240)
    doc.setLineWidth(0.2)
    doc.line(MARGIN_X, dividerY, pageWidth - MARGIN_X, dividerY)

    yPos += headerH + TABLE_HEADER_GAP
  }

  const drawRow = (row: NoteListRow) => {
    const textX = MARGIN_X + PAD
    const maxTextWidth = RIGHT_X - PAD - textX
    const titleFontSize = row.isDetail ? 13 : 14
    const titleFontWeight = row.isDetail ? 'normal' : 'bold'
    doc.setFont('helvetica', titleFontWeight)
    doc.setFontSize(titleFontSize)
    const titleLines = doc.splitTextToSize(row.title || '', maxTextWidth)
    const lineHeight = doc.getTextDimensions('Ag').h
    const extraH = Math.max(0, titleLines.length - 1) * lineHeight
    const metaText = row.meta || ''
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    const metaHeight = metaText
      ? doc.getTextDimensions(metaText).h
      : doc.getTextDimensions('00/00/0000').h
    const contentH =
      ITEM_NAME_OFFSET +
      titleLines.length * lineHeight +
      ITEM_DATE_OFFSET +
      metaHeight +
      ITEM_BOTTOM_PAD
    const rowH = Math.max(ITEM_ROW_BASE_H + extraH, contentH)
    const nameYStart = yPos + ITEM_NAME_OFFSET
    const metaY = nameYStart + lineHeight * (titleLines.length - 1) + ITEM_DATE_OFFSET

    doc.setFont('helvetica', titleFontWeight)
    doc.setFontSize(titleFontSize)
    doc.setTextColor(12, 15, 23)
    titleLines.forEach((line, idx) => {
      const lineY = nameYStart + lineHeight * idx
      doc.text(line, textX, lineY, { baseline: 'top' })
    })

    const valueY = nameYStart
    doc.text(row.valueLabel || '', RIGHT_X - PAD / 2, valueY, {
      align: 'right',
      baseline: 'top'
    })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(100, 102, 108)
    if (metaText) {
      doc.text(metaText, textX, metaY, { baseline: 'top' })
    }

    yPos += rowH
    doc.setDrawColor(230, 232, 236)
    doc.setLineWidth(0.2)
    doc.line(MARGIN_X, yPos, pageWidth - MARGIN_X, yPos)
  }

  const drawTotalBar = (total: number, liters: number) => {
    yPos += GAP_MD
    doc.setFillColor(184, 255, 44)
    doc.roundedRect(MARGIN_X, yPos, CONTENT_W, totalBarHeight, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(12, 15, 23)
    const totalTextY = yPos + totalBarHeight / 2
    const litersLabel = `${(liters || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })} LITROS`
    doc.text(`TOTAL ${litersLabel}`, MARGIN_X + PAD, totalTextY, { baseline: 'middle' })
    doc.text(fmtMoney(total), RIGHT_X - PAD, totalTextY, { align: 'right', baseline: 'middle' })
    yPos += totalBarHeight + GAP_SM
  }

  const drawFooter = (createdAt: Date, noteId: string) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 102, 108)
    const createdStr = createdAt.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    const createdTime = createdAt.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
    doc.text(`Gerado em: ${createdStr} \u00e0s ${createdTime}`, MARGIN_X, yPos + 4)
    doc.text(`ID da nota: ${noteId}`, MARGIN_X, yPos + 9)
    yPos += footerHeight
  }

  const pageWidth = doc.internal.pageSize.getWidth()

  drawHeader()
  drawTitleAndDate()
  drawPayerSection()
  drawTableHeader()
  rows.forEach((row) => drawRow(row))

  const createdAt = data.emittedAt || new Date()

  drawTotalBar(totalWithPending, filteredLiters)

  const remaining = finalHeight - yPos - footerHeight - bottomMargin
  if (remaining > 0) {
    yPos += Math.min(remaining, GAP_MD)
  }
  drawFooter(createdAt, data.noteId)

  const safeFileName = `${data.noteId || `Nota_${data.clientName.replace(/\s+/g, '_')}_${new Date().getTime()}`}.pdf`
  return { doc, fileName: safeFileName }
}

export const generateNotaPdf = async (data: NotePdfInput): Promise<ReceiptFileRef> => {
  const { doc, fileName } = await buildNoteDoc(data)
  const pdfBlob = doc.output('blob')
  const mimeType = 'application/pdf'
  const isNative = Capacitor.isNativePlatform?.() ?? false

  if (!isNative) {
    const uri = URL.createObjectURL(pdfBlob)
    return { source: 'web', uri, fileName, mimeType, blob: pdfBlob }
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

  const uri = await Filesystem.getUri({
    path: savePath,
    directory: saveDirectory
  })

  return {
    source: 'native',
    directory: saveDirectory,
    path: savePath,
    uri: uri.uri ?? null,
    fileName,
    mimeType,
    base64,
    blob: pdfBlob
  }
}

export const generateReceipt = (
  clientName: string,
  amount: number,
  salesPaid: Sale[],
  paymentDate: string,
  action: 'open' | 'share' = 'open'
) => {
  const run = async () => {
    const { doc, fileName } = await buildReceiptDoc(clientName, amount, salesPaid, paymentDate)
    const isNative = Capacitor.isNativePlatform?.() ?? false

    const openNative = async () => {
      const pdfBlob = doc.output('blob')
      const base64 = await toBase64(pdfBlob)

      const savePath = `receipts/${fileName}`
      const saveDirectory: Directory = Directory.Documents

      const saveResult = await Filesystem.writeFile({
        path: savePath,
        data: base64,
        directory: saveDirectory,
        recursive: true
      })

      const uri = await Filesystem.getUri({
        path: savePath,
        directory: saveDirectory
      })

      const target = uri.uri || saveResult?.uri
      if (target) {
        if (action === 'share') {
          await Share.share({
            title: 'Comprovante de Pagamento',
            text: `Comprovante de ${clientName}`,
            url: target,
            dialogTitle: 'Compartilhar PDF'
          })
        } else {
          await FileOpener.openFile({ path: target, contentType: 'application/pdf' })
        }
        return
      }

      const blobUrl = URL.createObjectURL(pdfBlob)
      window.open(blobUrl, '_blank')
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
    }

    try {
      if (!isNative) {
        if (action === 'share') {
          alert('Compartilhar nÃ£o Ã© suportado no navegador; o PDF serÃ¡ baixado.')
        }
        doc.save(fileName)
        return
      }

      openNative().catch((err) => {
        console.warn('Falha ao salvar/abrir/compartilhar PDF nativo, fallback para download', err)
        alert('NÃ£o foi possÃ­vel abrir/compartilhar o PDF. Verifique se hÃ¡ leitor de PDF instalado.')
        doc.save(fileName)
      })
    } catch (err) {
      console.warn('Falha ao salvar/abrir/compartilhar PDF nativo, fallback para download', err)
      alert('NÃ£o foi possÃ­vel abrir/compartilhar o PDF. Verifique se hÃ¡ leitor de PDF instalado.')
      doc.save(fileName)
    }
  }

  run().catch((err) => {
    console.error('Erro ao gerar comprovante', err)
    alert('NÃ£o foi possÃ­vel gerar o comprovante.')
  })
}








