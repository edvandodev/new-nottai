import React from 'react'
import { DollarSign, FileText, Plus } from 'lucide-react'

type ClientActionBarInlineProps = {
  onAddSale: () => void
  onReceive: () => void
  onGenerateNote: () => void
  disableReceive?: boolean
  disableGenerateNote?: boolean
  className?: string
}

export function ClientActionBarInline({
  onAddSale,
  onReceive,
  onGenerateNote,
  disableReceive,
  disableGenerateNote,
  className = ''
}: ClientActionBarInlineProps) {
  const baseButton =
    'relative h-12 rounded-[14px] px-3 font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface,#0b0f14)]'

  const interactive = 'hover:-translate-y-[1px] hover:brightness-[1.04] active:scale-[0.98] active:brightness-95'
  const disabledState = 'opacity-60 cursor-not-allowed'

  return (
    <div className={`flex items-center gap-3 w-full ${className}`}>
      <button
        type='button'
        onClick={onAddSale}
        aria-label='Nova venda'
        className={`${baseButton} ${interactive} flex-[1.1] min-w-[0]`}
        style={{
          background:
            'linear-gradient(135deg, var(--primary, #2373ff), #1f5cc8)',
          color: '#ffffff',
          boxShadow: '0 10px 30px -16px rgba(35, 115, 255, 0.6)',
          border: '1px solid rgba(71, 123, 255, 0.45)'
        }}
      >
        <Plus size={18} strokeWidth={2.6} className='shrink-0' />
        <span className='whitespace-nowrap'>Nova Venda</span>
      </button>

      <button
        type='button'
        onClick={onReceive}
        aria-label='Receber pagamento'
        disabled={disableReceive}
        className={`${baseButton} flex-[1] min-w-[0] ${
          disableReceive ? disabledState : interactive
        } focus-visible:ring-[rgba(188,255,56,0.55)]`}
        style={
          disableReceive
            ? {
                background: 'var(--surface-2)',
                color: 'var(--muted)',
                border: '1px solid var(--border)'
              }
            : {
                background: 'var(--accent, #bcff38)',
                color: 'var(--accent-ink, #0c1014)',
                border: '1px solid var(--accent, #bcff38)',
                boxShadow: '0 12px 30px -18px rgba(188, 255, 56, 0.65)'
              }
        }
      >
        <DollarSign size={18} strokeWidth={2.4} className='shrink-0' />
        <span className='whitespace-nowrap'>Receber</span>
      </button>

      <button
        type='button'
        onClick={onGenerateNote}
        aria-label='Gerar nota'
        disabled={disableGenerateNote}
        className={`${baseButton} flex-[0.35] min-w-[36px] px-1.5 ${
          disableGenerateNote ? disabledState : interactive
        } focus-visible:ring-[rgba(170,190,210,0.45)]`}
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1.5px solid rgba(170,190,210,0.35)',
          color: 'rgba(170,190,210,0.85)'
        }}
      >
        <FileText size={26} strokeWidth={2.2} className='shrink-0' />
      </button>
    </div>
  )
}
