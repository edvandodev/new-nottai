import { jsPDF } from 'jspdf'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { FileOpener } from '@capawesome-team/capacitor-file-opener'
import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'
import type { Sale } from '@/types'

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

const logoSrc = new URL('../../assets/comprovante/logo.png', import.meta.url).toString()
const illustrationSrc = new URL('../../assets/comprovante/ilustracao.png', import.meta.url).toString()

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








