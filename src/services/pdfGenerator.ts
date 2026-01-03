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

const buildReceiptDoc = (
  clientName: string,
  amount: number,
  salesPaid: Sale[],
  paymentDate: string
) => {
  const doc = new jsPDF({ unit: 'mm', format: [148, 263] })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let yPos = 20

  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  doc.setFillColor(37, 99, 235)
  doc.rect(0, 0, pageWidth, 40, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('Comprovante de Pagamento', pageWidth / 2, 20, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('Nottai', pageWidth / 2, 30, { align: 'center' })

  yPos = 55

  doc.setTextColor(40, 40, 40)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(`Cliente: ${clientName}`, margin, yPos)

  yPos += 8
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Data do Pagamento: ${new Date(paymentDate).toLocaleDateString(
      'pt-BR'
    )} às ${new Date(paymentDate).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })}`,
    margin,
    yPos
  )

  yPos += 15

  doc.setDrawColor(200, 200, 200)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 8

  doc.setFont('helvetica', 'bold')
  doc.text('Descrição / Data da Compra', margin, yPos)
  doc.text('Valor', pageWidth - margin, yPos, { align: 'right' })

  yPos += 4
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 8

  doc.setFont('helvetica', 'normal')

  salesPaid.forEach((sale) => {
    const dateStr = new Date(sale.date as any).toLocaleDateString('pt-BR')
    const itemDesc = `Leite (${sale.liters}L) - ${dateStr}`
    const itemValue = formatBRL(sale.totalValue)

    doc.text(itemDesc, margin, yPos)
    doc.text(itemValue, pageWidth - margin, yPos, { align: 'right' })
    yPos += 7
  })

  yPos += 5
  doc.line(margin, yPos, pageWidth - margin, yPos)

  yPos += 12
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(22, 163, 74)
  doc.text(`TOTAL PAGO: ${formatBRL(amount)}`, pageWidth - margin, yPos, {
    align: 'right'
  })

  yPos += 30
  doc.setFontSize(10)
  doc.setTextColor(150, 150, 150)
  doc.setFont('helvetica', 'italic')
  doc.text('Gerado por Nottai', pageWidth / 2, yPos, { align: 'center' })

  const fileName = `Comprovante_${clientName.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`
  return { doc, fileName }
}

export const generateReceiptFile = async (
  clientName: string,
  amount: number,
  salesPaid: Sale[],
  paymentDate: string
) => {
  const { doc, fileName } = buildReceiptDoc(clientName, amount, salesPaid, paymentDate)
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
  const { doc, fileName } = buildReceiptDoc(clientName, amount, salesPaid, paymentDate)
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
  const { doc, fileName } = buildReceiptDoc(clientName, amount, salesPaid, paymentDate)
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
