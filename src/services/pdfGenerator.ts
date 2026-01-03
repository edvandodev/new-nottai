import { jsPDF } from 'jspdf'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { FileOpener } from '@capawesome-team/capacitor-file-opener'
import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'
import type { Sale } from '@/types'

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
  return `${dateStr.charAt(0).toUpperCase()}${dateStr.slice(1)} • ${timeStr}`
}

const loadImageSize = async (dataUrl: string | null) => {
  return new Promise<{ w: number; h: number }>((resolve) => {
    if (!dataUrl) {
      resolve({ w: 1, h: 1 })
      return
    }
    try {
      const img = new Image()
      img.onload = () => {
        resolve({
          w: img.naturalWidth || 1,
          h: img.naturalHeight || 1
        })
      }
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

const buildReceiptDoc = async (
  clientName: string,
  amount: number,
  salesPaid: Sale[],
  paymentDate: string
) => {
  const doc = new jsPDF({ unit: 'mm', format: [148, 263] })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const MARGIN_X = 14
  const CONTENT_W = pageWidth - MARGIN_X * 2
  const RIGHT_X = pageWidth - MARGIN_X
  const PAD = 6
  const GAP_SM = 6
  const GAP_MD = 10
  const headerHeight = 42
  const totalCardHeight = 18

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

  let yPos = headerHeight + GAP_MD

  const ensureSpace = (spaceNeeded: number) => {
    if (yPos + spaceNeeded <= pageHeight - MARGIN_X) return
    doc.addPage()
    drawHeader()
    yPos = headerHeight + GAP_MD
  }

  const drawKeyValueCard = (
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    value: string
  ) => {
    doc.setFillColor(242, 242, 244)
    doc.roundedRect(x, y, w, h, 3, 3, 'F')
    const textY = y + h / 2
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(98, 157, 46)
    doc.text(label, x + PAD, textY, { baseline: 'middle' })
    doc.setTextColor(12, 15, 23)
    doc.text(value, RIGHT_X, textY, { align: 'right', baseline: 'middle' })
  }

  const drawSectionLabel = (x: number, y: number, text: string) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(30, 32, 36)
    doc.text(text, x, y)
  }

  const drawItemRow = (x: number, y: number, item: Sale) => {
    const textX = x + PAD
    const maxTextWidth = RIGHT_X - PAD - textX
    const title = `Leite (${item.liters || 0}L)`
    const titleLines = doc.splitTextToSize(title, maxTextWidth)
    const lineHeight = 6
    const dateHeight = 4.5
    const minHeight = 18
    const blockHeight = Math.max(minHeight, titleLines.length * lineHeight + dateHeight + GAP_SM)

    ensureSpace(blockHeight + 1)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(12, 15, 23)
    titleLines.forEach((line, idx) => {
      const lineY = y + lineHeight * idx + lineHeight / 2 + 1
      doc.text(line, textX, lineY, { baseline: 'middle' })
    })

    const valueY = y + blockHeight / 2
    doc.text(fmtMoney(item.totalValue || 0), RIGHT_X, valueY, {
      align: 'right',
      baseline: 'middle'
    })

    const dateStr = item.date ? new Date(item.date as any).toLocaleDateString('pt-BR') : ''
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(90, 94, 104)
    doc.text(dateStr, textX, y + blockHeight - GAP_SM, { baseline: 'middle' })

    doc.setDrawColor(230, 232, 236)
    doc.setLineWidth(0.2)
    doc.line(MARGIN_X, y + blockHeight, pageWidth - MARGIN_X, y + blockHeight)

    return blockHeight
  }

  drawHeader()

  // Titulo e data
  doc.setTextColor(12, 15, 23)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text('Comprovante de pagamento', MARGIN_X, yPos)

  yPos += GAP_SM
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(90, 94, 104)
  doc.text(fmtDateLong(paymentDate), MARGIN_X, yPos)
  doc.setTextColor(12, 15, 23)

  // Total pago
  yPos += GAP_MD
  ensureSpace(totalCardHeight + 10)
  drawKeyValueCard(MARGIN_X, yPos, CONTENT_W, totalCardHeight, 'Total pago:', fmtMoney(amount))

  // Pagador
  yPos += totalCardHeight + GAP_MD
  ensureSpace(24)
  drawSectionLabel(MARGIN_X, yPos, 'PAGADOR:')
  yPos += GAP_SM
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(104, 159, 30)
  doc.text(clientName || 'Cliente', MARGIN_X, yPos)

  // Linha divisoria
  yPos += GAP_SM
  doc.setDrawColor(234, 236, 240)
  doc.setLineWidth(0.2)
  doc.line(MARGIN_X, yPos, pageWidth - MARGIN_X, yPos)

  // Header da lista
  yPos += GAP_SM
  const listHeaderHeight = 12
  ensureSpace(listHeaderHeight + GAP_SM)
  doc.setFillColor(242, 242, 244)
  doc.roundedRect(MARGIN_X, yPos, CONTENT_W, listHeaderHeight, 2, 2, 'F')
  const listTextY = yPos + listHeaderHeight / 2
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(30, 32, 36)
  doc.text('Descricao /Data da Compra', MARGIN_X + PAD, listTextY, { baseline: 'middle' })
  doc.text('Valor', RIGHT_X, listTextY, { align: 'right', baseline: 'middle' })
  yPos += listHeaderHeight + GAP_SM

  // Itens (um a um)
  salesPaid.forEach((sale, idx) => {
    const consumed = drawItemRow(MARGIN_X, yPos, sale)
    yPos += consumed
    if (idx === salesPaid.length - 1) {
      yPos += GAP_SM
    }
  })

  // Total final
  ensureSpace(20)
  doc.setFillColor(184, 255, 44)
  doc.roundedRect(MARGIN_X, yPos, CONTENT_W, 16, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(12, 15, 23)
  const totalTextY = yPos + 8
  doc.text('TOTAL:', MARGIN_X + PAD, totalTextY, { baseline: 'middle' })
  doc.text(fmtMoney(amount), RIGHT_X, totalTextY, { align: 'right', baseline: 'middle' })

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
          alert('Compartilhar não é suportado no navegador; o PDF será baixado.')
        }
        doc.save(fileName)
        return
      }

      openNative().catch((err) => {
        console.warn('Falha ao salvar/abrir/compartilhar PDF nativo, fallback para download', err)
        alert('Não foi possível abrir/compartilhar o PDF. Verifique se há leitor de PDF instalado.')
        doc.save(fileName)
      })
    } catch (err) {
      console.warn('Falha ao salvar/abrir/compartilhar PDF nativo, fallback para download', err)
      alert('Não foi possível abrir/compartilhar o PDF. Verifique se há leitor de PDF instalado.')
      doc.save(fileName)
    }
  }

  run().catch((err) => {
    console.error('Erro ao gerar comprovante', err)
    alert('Não foi possível gerar o comprovante.')
  })
}
