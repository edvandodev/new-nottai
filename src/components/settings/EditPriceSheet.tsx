import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'

type EditPriceSheetProps = {
  open: boolean
  initialValue: number
  onClose: () => void
  onSave: (value: number) => Promise<void> | void
  title?: string
}

export function EditPriceSheet({
  open,
  initialValue,
  onClose,
  onSave,
  title
}: EditPriceSheetProps) {
  const [inputDigits, setInputDigits] = useState<string>('')
  const [cents, setCents] = useState<number>(0)
  const [initialCents, setInitialCents] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const formatCentsToBRL = (value: number) => {
    const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0
    return `R$ ${Number(safeValue / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }

  const parseDigitsToCents = (digits: string) => {
    const parsed = parseInt(digits || '0', 10)
    return Number.isFinite(parsed) ? parsed : 0
  }

  useEffect(() => {
    if (!open) return
    const nextInitial = Math.max(0, Math.round((initialValue ?? 0) * 100))
    setInitialCents(nextInitial)
    setCents(nextInitial)
    setInputDigits(nextInitial > 0 ? String(nextInitial) : '')
    setError(null)
    setIsSaving(false)
  }, [open, initialValue])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2400)
    return () => window.clearTimeout(timer)
  }, [toast])

  const handleChange = (nextValue: string) => {
    const digits = nextValue.replace(/\D/g, '')
    setInputDigits(digits)
    setCents(parseDigitsToCents(digits))
    setError(null)
  }

  const handleIncrement = (increment: number) => {
    setError(null)
    setCents((prev) => {
      const next = Math.max(0, prev + increment)
      setInputDigits(next === 0 ? '' : String(next))
      return next
    })
  }

  const handleSave = async () => {
    if (cents <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }
    if (cents === initialCents) {
      setError('Altere o valor para salvar.')
      return
    }
    try {
      setIsSaving(true)
      await onSave(cents / 100)
      setToast('Pre\u00e7o padr\u00e3o atualizado')
      onClose()
    } catch (err) {
      setError('N\u00e3o foi poss\u00edvel salvar. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  const formattedValue = inputDigits === '' ? '' : formatCentsToBRL(cents)
  const isSaveDisabled = isSaving || cents <= 0 || cents === initialCents
  const heading = title ? title.replace('Pre\u00e7o', 'Editar pre\u00e7o') : 'Editar pre\u00e7o padr\u00e3o'

  if (!open && !toast) return null

  return (
    <>
      {open && (
        <div
          className='fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 animate-fade-in'
          onClick={onClose}
          style={{
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)'
          }}
        >
          <div
            className='w-full max-w-xl rounded-[22px] border overflow-hidden animate-slide-up'
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              boxShadow: '0 -20px 50px -32px var(--shadow)'
            }}
          >
            <div className='px-5 pt-5 pb-4 border-b flex items-center justify-between' style={{ borderColor: 'var(--border)' }}>
              <div className='flex flex-col gap-1'>
                <p className='text-[11px] uppercase tracking-[0.14em] font-semibold' style={{ color: 'var(--muted)' }}>
                  {'Editar pre\u00e7o'}
                </p>
                <h2 className='text-xl font-semibold leading-tight' style={{ color: 'var(--text)' }}>
                  {heading}
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label='Fechar'
                className='h-10 w-10 rounded-full flex items-center justify-center transition-all active:scale-95'
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--muted)'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className='px-5 pt-4 pb-5 space-y-4'>
              {error && (
                <div
                  className='p-3 rounded-xl text-sm'
                  style={{
                    background: 'rgba(255, 90, 106, 0.12)',
                    border: '1px solid rgba(255, 90, 106, 0.35)',
                    color: 'var(--danger)'
                  }}
                >
                  {error}
                </div>
              )}

              <div className='space-y-2'>
                <label className='text-sm font-medium' style={{ color: 'var(--muted)' }}>
                  Valor (R$/L)
                </label>
                <input
                  type='text'
                  inputMode='numeric'
                  pattern='[0-9]*'
                  value={formattedValue}
                  onChange={(e) => handleChange(e.target.value)}
                  placeholder='R$ 0,00'
                  className='w-full px-4 py-3 rounded-2xl text-lg font-semibold tracking-tight focus:outline-none'
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)'
                  }}
                />
                <p className='text-xs' style={{ color: 'var(--muted)' }}>
                  Esse valor será aplicado automaticamente nas novas vendas.
                </p>
              </div>

              <div className='flex gap-2'>
                {[10, 50, 100].map((increment) => (
                  <button
                    key={increment}
                    type='button'
                    onClick={() => handleIncrement(increment)}
                    className='flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all active:scale-95'
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)'
                    }}
                  >
                    {`+${formatCentsToBRL(increment).replace('R$ ', '')}`}
                  </button>
                ))}
              </div>
            </div>

            <div
              className='px-5 pb-5 flex items-center gap-3'
              style={{
                paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))'
              }}
            >
              <button
                onClick={onClose}
                className='flex-1 py-3 rounded-xl font-semibold transition-all active:scale-95'
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text)'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaveDisabled}
                className='flex-1 py-3 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed'
                style={{
                  background:
                    'linear-gradient(135deg, rgba(184, 255, 44, 1) 0%, rgba(154, 236, 38, 1) 100%)',
                  color: 'var(--accent-ink)',
                  boxShadow:
                    '0 14px 32px -20px rgba(184, 255, 44, 0.65), 0 0 16px rgba(184, 255, 44, 0.2)',
                  border: '1px solid rgba(184, 255, 44, 0.55)'
                }}
              >
                {isSaving ? 'Salvando...' : 'Salvar altera\u00e7\u00f5es'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className='fixed inset-x-0 bottom-5 z-50 flex justify-center px-4 pointer-events-none'>
          <div
            className='px-4 py-3 rounded-2xl text-sm font-semibold shadow-lg'
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              boxShadow: '0 18px 40px -24px var(--shadow)'
            }}
          >
            {toast}
          </div>
        </div>
      )}
    </>
  )
}
