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
    <div
      data-theme='flat-lime'
      className='fixed inset-0 z-50 flex items-center justify-center px-4 py-10'
    >
      <div
        className='absolute inset-0 transition-opacity'
        style={{
          background: 'rgba(11, 15, 20, 0.72)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
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
        className='relative w-[92vw] max-w-[420px] max-h-[80vh] overflow-hidden rounded-[24px] shadow-2xl border flex flex-col'
        style={{
          background: 'rgba(18, 24, 33, 0.9)',
          backdropFilter: 'blur(12px)',
          borderColor: 'rgba(30, 42, 56, 0.8)',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.98)',
          transition: `opacity ${ANIMATION_DURATION}ms ease, transform ${ANIMATION_DURATION}ms ease`,
          boxShadow: '0 28px 60px -36px rgba(0, 0, 0, 0.6)'
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className='flex items-center justify-between px-5 py-4 border-b'
          style={{ borderColor: 'var(--border)' }}
        >
          <h3 id={titleId} className='text-lg font-semibold' style={{ color: 'var(--text)' }}>
            Receber
          </h3>
          <button
            type='button'
            onClick={onClose}
            className='h-11 w-11 rounded-full flex items-center justify-center transition-colors'
            aria-label='Fechar'
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--muted)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div className='flex-1 overflow-y-auto px-5 py-5 space-y-5 custom-scrollbar'>
          <div
            className='flex items-center gap-4 rounded-[18px] p-4 border'
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border)'
            }}
          >
            <div className='relative'>
              {client.avatarUrl ? (
                <img
                  src={client.avatarUrl}
                  alt={client.name}
                  className='h-14 w-14 rounded-full object-cover border'
                  style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                />
              ) : (
                <div
                  className='h-14 w-14 rounded-full flex items-center justify-center text-sm font-semibold'
                  style={{
                    background: 'rgba(184, 255, 44, 0.12)',
                    color: 'var(--accent)',
                    border: '1px solid rgba(184, 255, 44, 0.3)'
                  }}
                >
                  {(client.name || '?').trim().charAt(0).toUpperCase()}
                </div>
              )}
              <span
                className='absolute -bottom-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center border'
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)'
                }}
                aria-hidden='true'
              >
                <CheckCircle size={14} style={{ color: 'var(--accent)' }} />
              </span>
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-base font-semibold truncate' style={{ color: 'var(--text)' }}>
                {client.name}
              </p>
              <p className='text-sm' style={{ color: 'var(--muted)' }}>
                Total a receber{' '}
                <span className='font-semibold' style={{ color: 'var(--accent)' }}>
                  R$ {formattedTotal}
                </span>
              </p>
            </div>
          </div>

          <div
            className='space-y-3 rounded-[18px] p-4 border'
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)'
            }}
          >
            <label className='block text-sm font-medium' style={{ color: 'var(--muted)' }}>
              Valor a receber
            </label>
            <div className='relative'>
              <div className='absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2'>
                <div
                  className='h-9 w-9 rounded-xl flex items-center justify-center'
                  style={{
                    background: 'rgba(188, 255, 56, 0.12)',
                    color: 'var(--accent)',
                    border: '1px solid rgba(188, 255, 56, 0.2)'
                  }}
                >
                  <DollarSign size={18} />
                </div>
                <span className='text-sm font-semibold' style={{ color: 'var(--muted)' }}>
                  R$
                </span>
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
                className='w-full h-14 pl-24 pr-4 rounded-2xl text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400/60'
                style={{
                  background: 'rgba(11, 15, 20, 0.55)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  caretColor: 'var(--accent)'
                }}
              />
            </div>
            <p className='text-xs' style={{ color: 'var(--muted)' }}>
              Ajuste o valor caso o pagamento seja parcial.
            </p>
            {error && (
              <div className='bg-red-500/10 border border-red-500/30 text-red-200 text-xs px-3 py-2 rounded-xl'>
                {error}
              </div>
            )}
          </div>

          <div
            className='rounded-2xl p-3 flex gap-3 border'
            style={{
              background: 'rgba(255, 216, 77, 0.12)',
              borderColor: 'rgba(255, 216, 77, 0.3)'
            }}
          >
            <AlertTriangle
              size={18}
              className='shrink-0 mt-0.5'
              style={{ color: 'var(--warning)' }}
            />
            <p className='text-xs' style={{ color: 'rgba(255, 236, 194, 0.9)' }}>
              {warningText}
            </p>
          </div>
        </div>

        <div
          className='px-5 pb-5 pt-3 flex flex-col gap-3 border-t'
          style={{
            borderColor: 'var(--border)',
            paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))'
          }}
        >
          <button
            type='button'
            onClick={handleConfirm}
            disabled={isSubmitting}
            className='w-full h-14 rounded-2xl font-semibold transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed'
            style={{
              background:
                'linear-gradient(135deg, rgba(184, 255, 44, 1) 0%, rgba(154, 236, 38, 1) 100%)',
              color: 'var(--accent-ink, #0c1014)',
              boxShadow:
                '0 16px 30px -18px rgba(184, 255, 44, 0.55), 0 0 18px rgba(184, 255, 44, 0.2)'
            }}
          >
            {isSubmitting ? 'Processando...' : 'Receber'}
          </button>
          <button
            type='button'
            onClick={onClose}
            className='w-full h-12 rounded-2xl font-semibold transition-all active:scale-[0.99]'
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text)'
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
