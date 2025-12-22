import React, { useEffect, useState } from 'react'

type EditPriceSheetProps = {
  open: boolean
  initialValue: number
  onClose: () => void
  onSave: (value: number) => Promise<void> | void
}

export function EditPriceSheet({ open, initialValue, onClose, onSave }: EditPriceSheetProps) {
  const [value, setValue] = useState<string>(String(initialValue ?? 0))
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setValue(String(initialValue ?? 0))
      setError(null)
    }
  }, [open, initialValue])

  const parsePrice = (v: string) => {
    const n = Number(String(v).replace(',', '.'))
    return Number.isFinite(n) ? n : NaN
  }

  const handleSave = async () => {
    const parsed = parsePrice(value)
    if (!Number.isFinite(parsed) || value.trim() === '') {
      setError('Informe um valor valido.')
      return
    }
    if (parsed < 0) {
      setError('Valor n\u00e3o pode ser negativo.')
      return
    }
    try {
      setIsSaving(true)
      await onSave(parsed)
      onClose()
    } catch (err) {
      setError('N\u00e3o foi poss\u00edvel salvar. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className='fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 backdrop-blur-sm px-3 pb-3'>
      <div
        className='w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl shadow-black/40 overflow-hidden animate-slide-up'
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow)'
        }}
      >
        <div className='px-5 pt-4 pb-3 flex items-center justify-between'>
          <div>
            <p className='text-[11px] uppercase tracking-[0.08em] text-slate-500 font-semibold'>
              {'Editar pre\u00e7o'}
            </p>
            <h2 className='text-lg font-semibold text-white'>
              {'Pre\u00e7o padr\u00e3o (R$/L)'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className='text-slate-400 hover:text-white text-sm font-semibold'
          >
            Cancelar
          </button>
        </div>
        <div className='px-5 pb-4 space-y-3'>
          {error && (
            <div className='p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-sm'>
              {error}
            </div>
          )}
          <div className='space-y-1'>
            <label className='text-sm text-slate-300'>Valor (R$/L)</label>
            <input
              type='number'
              step='0.01'
              inputMode='decimal'
              min='0'
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className='w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
              placeholder='0,00'
            />
          </div>
        </div>
        <div className='px-5 pb-5 flex items-center gap-3'>
          <button
            onClick={onClose}
            className='flex-1 py-3 rounded-xl border border-slate-700 text-slate-100 font-semibold hover:border-slate-500 hover:bg-slate-800 transition-colors active:scale-[0.99]'
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className='flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold border border-blue-500/70 shadow-[0_12px_30px_-15px_rgba(59,130,246,0.9)] transition-all active:scale-[0.99] disabled:opacity-60'
          >
            {isSaving ? 'Salvando...' : 'Salvar alteracoes'}
          </button>
        </div>
      </div>
    </div>
  )
}
