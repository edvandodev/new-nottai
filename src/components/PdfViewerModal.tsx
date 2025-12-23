import React, { useEffect, useRef, useState } from 'react'
import { Share } from '@capacitor/share'
import { Filesystem } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'
import { X, Share as ShareIcon, Download, ZoomIn, ZoomOut } from 'lucide-react'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min?url'
import type { ReceiptFileRef } from '@/services/pdfGenerator'

GlobalWorkerOptions.workerSrc = pdfWorkerSrc

type PdfViewerModalProps = {
  open: boolean
  onClose: () => void
  file: ReceiptFileRef | null
  title?: string
}

const decodeBase64ToUint8 = (b64: string) => {
  const binary = atob(b64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ open, onClose, file, title }) => {
  const canvasRefs = useRef<HTMLCanvasElement[]>([])
  const pdfDocRef = useRef<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1.25)

  const fileName = file?.fileName || 'comprovante.pdf'

  const renderPages = async (pdf: any, scaleValue: number) => {
    const renderPage = async (pageNumber: number) => {
      const page = await pdf.getPage(pageNumber)
      const viewport = page.getViewport({ scale: scaleValue })
      const canvas = canvasRefs.current[pageNumber - 1]
      if (!canvas) return
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Contexto 2D indisponível.')
      canvas.height = viewport.height
      canvas.width = viewport.width
      // Fixa o tamanho visual para refletir o zoom (sem deixar o CSS comprimir)
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`
      await page.render({ canvasContext: context, viewport }).promise
    }

    await Promise.all(Array.from({ length: pdf.numPages }, (_, i) => renderPage(i + 1)))
  }

  // Carrega o documento quando arquivo/abertura mudam
  useEffect(() => {
    if (!file || !open) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        let data: Uint8Array | null = null
        if (file.base64) {
          data = decodeBase64ToUint8(file.base64)
        } else if (file.uri) {
          if (file.source === 'native' && file.path && file.directory) {
            const res = await Filesystem.readFile({
              path: file.path,
              directory: file.directory
            })
            data = decodeBase64ToUint8(res.data)
          } else {
            const res = await fetch(file.uri)
            const buf = await res.arrayBuffer()
            data = new Uint8Array(buf)
          }
        }
        if (!data) throw new Error('Não foi possível carregar o PDF.')

        const pdf = await getDocument({ data }).promise
        if (cancelled) return
        pdfDocRef.current = pdf
        setNumPages(pdf.numPages)
        await renderPages(pdf, scale)
      } catch (err: any) {
        console.error('Erro ao renderizar PDF', err)
        if (!cancelled) setError('Não foi possível renderizar o PDF.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, open])

  // Re-renderiza quando o zoom muda
  useEffect(() => {
    const pdf = pdfDocRef.current
    if (!open || !pdf) return
    let cancelled = false
    const rerender = async () => {
      setLoading(true)
      setError(null)
      try {
        await renderPages(pdf, scale)
      } catch (err) {
        console.error('Erro ao re-renderizar PDF', err)
        if (!cancelled) setError('Não foi possível renderizar o PDF.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    rerender()
    return () => {
      cancelled = true
    }
  }, [scale, open])

  const handleShare = async () => {
    if (!file?.uri) return
    try {
      await Share.share({
        title: 'Comprovante PDF',
        text: 'Envio do comprovante',
        url: file.uri,
        dialogTitle: 'Compartilhar PDF'
      })
    } catch (err) {
      console.warn('Erro ao compartilhar', err)
    }
  }

  const handleSaveExport = async () => {
    if (!file?.uri) return
    try {
      if (Capacitor.isNativePlatform?.()) {
        await Share.share({
          title: 'Salvar/Exportar PDF',
          url: file.uri,
          dialogTitle: 'Salvar PDF'
        })
      } else {
        const res = await fetch(file.uri)
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        link.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.warn('Erro ao salvar/exportar', err)
    }
  }

  const adjustScale = (delta: number) => {
    setScale((prev) => Math.min(2.5, Math.max(0.75, prev + delta)))
  }

  if (!open || !file) return null

  return (
    <div
      data-theme='flat-lime'
      className='fixed inset-0 z-50 flex items-center justify-center p-4'
      style={{
        background: 'rgba(11, 15, 20, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}
    >
      <div
        className='relative w-full max-w-5xl rounded-2xl overflow-hidden border'
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          boxShadow: '0 28px 60px -36px rgba(0, 0, 0, 0.6)'
        }}
      >
        <div
          className='flex items-center justify-between px-4 py-3 border-b'
          style={{ borderColor: 'var(--border)' }}
        >
          <div className='min-w-0'>
            <p className='text-sm font-semibold truncate' style={{ color: 'var(--text)' }}>
              {title || 'Visualizar PDF'}
            </p>
            <p className='text-xs truncate' style={{ color: 'var(--muted)' }}>
              {fileName}
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <button
              onClick={() => adjustScale(0.15)}
              className='h-9 w-9 rounded-full flex items-center justify-center transition-colors'
              aria-label='Mais zoom'
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)'
              }}
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => adjustScale(-0.15)}
              className='h-9 w-9 rounded-full flex items-center justify-center transition-colors'
              aria-label='Menos zoom'
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)'
              }}
            >
              <ZoomOut size={16} />
            </button>
            <button
              type='button'
              onClick={onClose}
              className='h-10 w-10 rounded-full flex items-center justify-center transition-colors'
              aria-label='Fechar'
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--muted)'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className='p-4' style={{ background: 'var(--bg)' }}>
          {loading && (
            <p className='text-sm inline-flex items-center gap-2' style={{ color: 'var(--muted)' }}>
              <span className='h-4 w-4 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin' />
              Carregando PDF...
            </p>
          )}
          {error && (
            <div
              className='text-sm space-y-2 mt-2 p-3 rounded-lg border'
              style={{
                background: 'rgba(255, 90, 106, 0.12)',
                borderColor: 'rgba(255, 90, 106, 0.35)',
                color: 'var(--danger)'
              }}
            >
              <p>{error}</p>
            </div>
          )}
          <div
            className='overflow-auto max-h-[70vh] border rounded-xl flex flex-col gap-4 p-4 mt-3'
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border)'
            }}
          >
            {Array.from({ length: numPages }, (_, i) => (
              <canvas
                key={i}
                ref={(el) => {
                  if (el) canvasRefs.current[i] = el
                }}
                className='block mx-auto'
              />
            ))}
          </div>
        </div>

        <div
          className='flex items-center justify-end gap-3 px-4 py-3 border-t'
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <button
            onClick={handleShare}
            className='flex items-center gap-2 px-3 py-2 rounded-lg transition-colors'
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-ink)'
            }}
          >
            <ShareIcon size={16} />
            Compartilhar
          </button>
          <button
            onClick={handleSaveExport}
            className='flex items-center gap-2 px-3 py-2 rounded-lg transition-colors'
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text)'
            }}
          >
            <Download size={16} />
            Salvar/Exportar
          </button>
        </div>
      </div>
    </div>
  )
}
