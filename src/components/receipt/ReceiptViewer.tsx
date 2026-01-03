import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Share as ShareIcon, RotateCcw } from 'lucide-react'
import { Document, Page } from 'react-pdf'
import '@/lib/pdfWorker'

type ReceiptViewerProps = {
  open: boolean
  pdfUrl: string | null
  onClose: () => void
  onShare: () => void
  title?: string
  documentLabel?: string
}

export const ReceiptViewer: React.FC<ReceiptViewerProps> = ({
  open,
  pdfUrl,
  onClose,
  onShare,
  title,
  documentLabel
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState<number>(0)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const el = containerRef.current
    if (!el) return

    const updateWidth = () => setContainerWidth(el.clientWidth)
    updateWidth()

    const observer = new ResizeObserver(updateWidth)
    observer.observe(el)
    return () => observer.disconnect()
  }, [open])

  const pageWidth = useMemo(() => {
    if (!containerWidth) return 0
    return Math.max(0, Math.min(containerWidth - 24, 720))
  }, [containerWidth])

  const heading = title || 'Comprovante'
  const docLabel = (documentLabel || heading || 'comprovante').toLowerCase()
  const docArticle = docLabel.endsWith('a') ? 'a' : 'o'

  if (!open || !pdfUrl) return null

  return (
    <div
      data-theme='flat-lime'
      className='fixed inset-0 z-[99] bg-white'
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <div className='h-full flex flex-col' style={{ color: '#0b1018' }}>
        <header
          className='flex items-center justify-between px-4 h-14 border-b shrink-0'
          style={{
            borderColor: 'rgba(0,0,0,0.08)',
            background: '#fff'
          }}
        >
          <button
            type='button'
            onClick={onClose}
            className='h-11 w-11 rounded-full flex items-center justify-center'
            aria-label='Voltar'
            style={{
              background: 'rgba(0,0,0,0.04)',
              color: '#0b1018'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className='text-base font-semibold'>{heading}</h1>
          <button
            type='button'
            onClick={onShare}
            className='h-11 w-11 rounded-full flex items-center justify-center'
            aria-label='Compartilhar'
            style={{
              background: 'rgba(0,0,0,0.04)',
              color: '#0b1018'
            }}
          >
            <ShareIcon size={18} />
          </button>
        </header>

        <div
          className='flex-1 overflow-auto'
          style={{
            background: '#f4f5f7',
            height:
              'calc(100dvh - 56px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))'
          }}
        >
          <div
            ref={containerRef}
            className='mx-auto w-full max-w-screen-md px-3 py-4 flex justify-center'
          >
            <Document
              key={`${pdfUrl}-${reloadTick}`}
              file={pdfUrl}
              loading={
                <p className='py-8 text-sm text-center text-slate-500'>{`Carregando ${docLabel}...`}</p>
              }
              onLoadSuccess={() => undefined}
              onLoadError={(err) => {
                console.error('Erro ao carregar PDF', err)
              }}
              error={
                <div className='py-8 text-center space-y-3'>
                  <p className='text-sm text-slate-600'>{`N\u00e3o foi poss\u00edvel abrir ${docArticle} ${docLabel}.`}</p>
                  <button
                    type='button'
                    onClick={() => setReloadTick((n) => n + 1)}
                    className='inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold'
                    style={{
                      background: '#0f172a',
                      color: '#fff'
                    }}
                  >
                    <RotateCcw size={16} />
                    Tentar novamente
                  </button>
                </div>
              }
            >
              <Page
                pageNumber={1}
                width={pageWidth || undefined}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                loading={<p className='py-8 text-sm text-center text-slate-500'>Carregando p\u00e1gina...</p>}
              />
            </Document>
          </div>
        </div>
      </div>
    </div>
  )
}
