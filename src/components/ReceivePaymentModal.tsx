import React, { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle, DollarSign, X } from 'lucide-react'

type ReceivePaymentModalProps = {
  open: boolean
  onClose: () => void
  client: { name: string; avatarUrl?: string }
  totalDue: number
  initialValue?: number
  onConfirm: (value: number, note?: string) => Promise<void> | void
}

const ANIMATION_DURATION = 220

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

const parseCurrencyInput = (value: string) => {
  const cleaned = value.replace(/[^\d.,]/g, '')
  if (!cleaned) return 0
  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  const separatorIndex = Math.max(lastComma, lastDot)

  let integerPart = cleaned
  let fractionalPart = ''

  if (separatorIndex >= 0) {
    integerPart = cleaned.slice(0, separatorIndex).replace(/[^\d]/g, '')
    fractionalPart = cleaned.slice(separatorIndex + 1).replace(/[^\d]/g, '')
  } else {
    integerPart = cleaned.replace(/[^\d]/g, '')
  }

  const normalized = fractionalPart ? `${integerPart}.${fractionalPart}` : integerPart
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

const sanitizeCurrencyInput = (value: string) => {
  let next = value.replace(/[^\d.,]/g, '')
  const commaCount = (next.match(/,/g) || []).length
  if (commaCount > 1) {
    const parts = next.split(',')
    next = `${parts[0]},${parts.slice(1).join('')}`
  }
  return next
}

export const ReceivePaymentModal = ({
  open,
  onClose,
  client,
  totalDue,
  initialValue,
  onConfirm
}: ReceivePaymentModalProps) => {
  const [shouldRender, setShouldRender] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [amountInput, setAmountInput] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const amountInputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (open) {
      setShouldRender(true)
      setIsVisible(false)
      const nextValue = initialValue ?? totalDue
      setAmountInput(formatCurrency(Math.max(0, nextValue)))
      setNote('')
      setError('')
      const raf = requestAnimationFrame(() => setIsVisible(true))
      return () => cancelAnimationFrame(raf)
    }
    if (!shouldRender) return
    setIsVisible(false)
    const timeout = window.setTimeout(
      () => setShouldRender(false),
      ANIMATION_DURATION
    )
    return () => window.clearTimeout(timeout)
  }, [open, totalDue, initialValue, shouldRender])

  useEffect(() => {
    if (!shouldRender) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const isShift = event.shiftKey
      const active = document.activeElement as HTMLElement | null
      if (isShift && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!isShift && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [shouldRender, onClose])

  const handleConfirm = async () => {
    if (isSubmitting) return
    const parsed = parseCurrencyInput(amountInput)
    const normalized = Math.min(totalDue, Number.isNaN(parsed) ? 0 : parsed)
    if (normalized <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }
    setIsSubmitting(true)
    try {
      await onConfirm(normalized, note.trim() || undefined)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!shouldRender || typeof document === 'undefined') return null

  const formattedTotal = formatCurrency(totalDue)
  const warningText =
    'Ao confirmar, registramos o pagamento e, se o valor for menor que o saldo, manteremos o restante em aberto no historico.'

  return createPortal(
    <div className='fixed inset-0 z-50 flex items-center justify-center px-4 py-10'>
      <div
        className='absolute inset-0 bg-black/55 backdrop-blur-[10px] transition-opacity'
        style={{
          opacity: isVisible ? 1 : 0,
          transitionDuration: `${ANIMATION_DURATION}ms`
        }}
        onClick={onClose}
        aria-hidden='true'
      />
      <div
        ref={modalRef}
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
        className='relative w-[92vw] max-w-[420px] max-h-[80vh] overflow-hidden rounded-[24px] shadow-2xl border border-white/10 flex flex-col'
        style={{
          background: 'rgba(20, 22, 26, 0.78)',
          backdropFilter: 'blur(12px)',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.98)',
          transition: `opacity ${ANIMATION_DURATION}ms ease, transform ${ANIMATION_DURATION}ms ease`
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className='flex items-center justify-between px-5 py-4 border-b border-white/10'>
          <h3 id={titleId} className='text-lg font-semibold text-white'>
            Receber
          </h3>
          <button
            type='button'
            onClick={onClose}
            className='h-11 w-11 rounded-full flex items-center justify-center text-slate-300 transition-colors'
            aria-label='Fechar'
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div className='flex-1 overflow-y-auto px-5 py-5 space-y-5 custom-scrollbar'>
          <div className='flex flex-col items-center text-center gap-2'>
            {client.avatarUrl ? (
              <img
                src={client.avatarUrl}
                alt={client.name}
                className='h-16 w-16 rounded-full object-cover border border-white/15'
              />
            ) : (
              <div className='h-16 w-16 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 border border-emerald-500/30'>
                <CheckCircle size={30} />
              </div>
            )}
            <p className='text-xl font-semibold text-white'>{client.name}</p>
            <p className='text-sm text-slate-400'>
              Total a receber{' '}
              <span
                className='text-base font-semibold'
                style={{ color: 'var(--accent, #bcff38)' }}
              >
                R$ {formattedTotal}
              </span>
            </p>
          </div>

          <div
            className='space-y-3 rounded-[18px] p-4 border'
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              borderColor: 'rgba(255, 255, 255, 0.08)'
            }}
          >
            <label className='block text-sm font-medium text-slate-300'>
              Valor a receber
            </label>
            <div className='relative'>
              <div className='absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2'>
                <div
                  className='h-9 w-9 rounded-xl flex items-center justify-center'
                  style={{
                    background: 'rgba(188, 255, 56, 0.12)',
                    color: 'var(--accent, #bcff38)',
                    border: '1px solid rgba(188, 255, 56, 0.2)'
                  }}
                >
                  <DollarSign size={18} />
                </div>
                <span className='text-sm font-semibold text-slate-300'>R$</span>
              </div>
              <input
                ref={amountInputRef}
                type='text'
                inputMode='decimal'
                value={amountInput}
                onChange={(event) => {
                  setAmountInput(sanitizeCurrencyInput(event.target.value))
                  setError('')
                }}
                onBlur={() => {
                  const parsed = parseCurrencyInput(amountInput)
                  if (amountInput) setAmountInput(formatCurrency(parsed))
                }}
                placeholder='0,00'
                className='w-full h-14 pl-24 pr-4 rounded-2xl text-white text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400/60'
                style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              />
            </div>
            <div className='flex items-center justify-between text-xs text-slate-400'>
              <span>Status</span>
              <span className='text-emerald-300'>Pago agora</span>
            </div>
            <p className='text-xs text-slate-500'>
              Ajuste o valor caso o pagamento seja parcial.
            </p>
            {error && (
              <div className='bg-red-500/10 border border-red-500/30 text-red-200 text-xs px-3 py-2 rounded-xl'>
                {error}
              </div>
            )}
          </div>

          <div className='space-y-2'>
            <label className='block text-sm font-medium text-slate-300'>
              Nota (opcional)
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className='w-full rounded-2xl text-white text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400/40'
              style={{
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
              placeholder='Nota (opcional)'
            />
          </div>

          <div
            className='rounded-2xl p-3 flex gap-3 border'
            style={{
              background: 'rgba(255, 193, 7, 0.12)',
              borderColor: 'rgba(255, 193, 7, 0.25)'
            }}
          >
            <AlertTriangle size={18} className='text-amber-300 shrink-0 mt-0.5' />
            <p className='text-xs text-amber-100/80'>{warningText}</p>
          </div>
        </div>

        <div
          className='px-5 pb-5 pt-3 flex flex-col gap-3 border-t border-white/10'
          style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            type='button'
            onClick={handleConfirm}
            disabled={isSubmitting}
            className='w-full h-14 rounded-2xl font-semibold text-slate-950 transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed'
            style={{
              background: 'var(--accent, #bcff38)',
              color: 'var(--accent-ink, #0c1014)',
              boxShadow: '0 14px 30px -18px rgba(188, 255, 56, 0.45)'
            }}
          >
            {isSubmitting ? 'Processando...' : 'Receber'}
          </button>
          <button
            type='button'
            onClick={onClose}
            className='w-full h-12 rounded-2xl font-semibold text-slate-200 transition-all active:scale-[0.99]'
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)'
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
