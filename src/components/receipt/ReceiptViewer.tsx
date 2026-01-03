import React, { useEffect } from 'react'
import { ArrowLeft, Share as ShareIcon } from 'lucide-react'

type ReceiptViewerProps = {
  open: boolean
  pdfUrl: string | null
  onClose: () => void
  onShare?: () => void
}

export const ReceiptViewer: React.FC<ReceiptViewerProps> = ({
  open,
  pdfUrl,
  onClose,
  onShare
}) => {
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open || !pdfUrl) return null

  return (
    <div
      data-theme='flat-lime'
      className='fixed inset-0 z-[99]'
      style={{
        background: '#fff',
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
          <h1 className='text-base font-semibold'>Comprovante</h1>
          <button
            type='button'
            onClick={onShare}
            disabled={!onShare}
            className='h-11 w-11 rounded-full flex items-center justify-center disabled:opacity-50'
            aria-label='Compartilhar'
            style={{
              background: 'rgba(0,0,0,0.04)',
              color: '#0b1018'
            }}
          >
            <ShareIcon size={18} />
          </button>
        </header>

        <div className='flex-1 overflow-hidden bg-white'>
          <iframe
            title='Comprovante PDF'
            src={pdfUrl}
            className='w-full h-full border-0'
          />
        </div>
      </div>
    </div>
  )
}
