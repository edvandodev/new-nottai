import React, { useState, useRef, useEffect } from 'react'
import {
  X,
  CalendarDays,
  Minus,
  Plus,
  AlertTriangle,
  Camera,
  Trash2,
  FileText,
  Share2,
  Tag
} from 'lucide-react'
import type {
  Client,
  PaymentStatus,
  PriceType,
  PriceSettings
} from '@/types'
import { ReceivePaymentModal } from './ReceivePaymentModal'

type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null

  return (
    <div
      data-theme='flat-lime'
      className='fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in'
      style={{
        background: 'rgba(11, 15, 20, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}
    >
      <div
        className='w-full max-w-md rounded-2xl overflow-hidden flex flex-col max-h-[90vh] border'
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          boxShadow: '0 24px 50px -34px var(--shadow)'
        }}
      >
        <div
          className='flex items-center justify-between p-4 border-b shrink-0'
          style={{ borderColor: 'var(--border)' }}
        >
          <h3 className='text-lg font-semibold' style={{ color: 'var(--text)' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className='h-9 w-9 rounded-full flex items-center justify-center transition-colors'
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--muted)'
            }}
            aria-label='Fechar'
          >
            <X size={18} />
          </button>
        </div>
        <div className='p-6 overflow-y-auto custom-scrollbar' style={{ color: 'var(--text)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

type ConfirmModalProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDanger?: boolean
}

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDanger = false
}: ConfirmModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className='space-y-6'>
        <div className='flex items-start gap-4'>
          {isDanger && (
            <div
              className='h-12 w-12 rounded-full flex items-center justify-center shrink-0'
              style={{
                background: 'rgba(255, 90, 106, 0.18)',
                color: 'var(--danger)'
              }}
            >
              <Trash2 size={22} />
            </div>
          )}
          <p className='text-base leading-relaxed pt-1' style={{ color: 'var(--text)' }}>
            {message}
          </p>
        </div>
        <div className='flex gap-3'>
          <button
            type='button'
            onClick={onClose}
            className='flex-1 py-3 px-4 rounded-xl font-semibold transition-colors'
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text)'
            }}
          >
            {cancelText}
          </button>
          <button
            type='button'
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className='flex-1 py-3 px-4 rounded-xl font-semibold transition-colors shadow-lg'
            style={{
              background: isDanger ? 'var(--danger)' : 'var(--accent)',
              color: isDanger ? '#fff' : 'var(--accent-ink)',
              boxShadow: isDanger
                ? '0 12px 24px -16px rgba(255, 90, 106, 0.6)'
                : '0 12px 24px -16px rgba(184, 255, 44, 0.55)'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}

type AddClientModalProps = {
  isOpen: boolean
  onClose: () => void
  onSave: (
    name: string,
    phone: string,
    priceType: PriceType,
    avatar?: string
  ) => void
  initialData?: Client | null
  existingNames: string[]
  priceSettings: PriceSettings
}

export const AddClientModal = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingNames,
  priceSettings
}: AddClientModalProps) => {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [priceType, setPriceType] = useState<PriceType>('STANDARD')
  const [avatar, setAvatar] = useState<string | undefined>(undefined)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name)
        setPhone(initialData.phone)
        setAvatar(initialData.avatar)
        setPriceType(initialData.priceType || 'STANDARD')
      } else {
        setName('')
        setPhone('')
        setAvatar(undefined)
        setPriceType('STANDARD')
      }
      setError('')
    }
  }, [isOpen, initialData])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatar(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = () => {
    const cleanName = name.trim()

    if (!cleanName) {
      setError('O campo Nome é obrigatório.')
      return
    }

    const isDuplicate = existingNames.some(
      (n) =>
        n.toLowerCase() === cleanName.toLowerCase() &&
        n.toLowerCase() !== initialData?.name.toLowerCase()
    )

    if (isDuplicate) {
      setError('Já existe um cliente com este nome.')
      return
    }

    onSave(cleanName, phone, priceType, avatar)
  }

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar Cliente' : 'Novo Cliente'}
    >
      <div className='space-y-4'>
        <div className='flex flex-col items-center mb-6'>
          <div
            onClick={() => fileInputRef.current?.click()}
            className='relative h-24 w-24 rounded-full border-2 border-dashed cursor-pointer flex items-center justify-center overflow-hidden transition-all group'
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border)'
            }}
          >
            {avatar ? (
              <img src={avatar} alt='Preview' className='h-full w-full object-cover' />
            ) : (
              <Camera size={32} style={{ color: 'var(--muted)' }} />
            )}
            <div className='absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'>
              <span className='text-xs text-white font-medium'>Alterar</span>
            </div>
          </div>
          <p className='text-xs mt-2' style={{ color: 'var(--muted)' }}>
            Toque para adicionar foto
          </p>
          <input
            type='file'
            ref={fileInputRef}
            onChange={handleFileChange}
            accept='image/*'
            className='hidden'
          />
        </div>

        {error && (
          <div
            className='p-3 rounded-lg text-sm flex items-center gap-2'
            style={{
              background: 'rgba(255, 90, 106, 0.12)',
              border: '1px solid rgba(255, 90, 106, 0.35)',
              color: 'var(--danger)'
            }}
          >
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <div>
          <label className='block text-sm font-medium mb-1' style={{ color: 'var(--muted)' }}>
            Nome
          </label>
          <input
            type='text'
            required
            autoFocus
            className='w-full p-3 rounded-lg focus:outline-none'
            placeholder='Ex: Dona Maria'
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError('')
            }}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text)'
            }}
          />
        </div>

        <div>
          <label className='block text-sm font-medium mb-1' style={{ color: 'var(--muted)' }}>
            Telefone (WhatsApp)
          </label>
          <input
            type='tel'
            className='w-full p-3 rounded-lg focus:outline-none'
            placeholder='DDD + Número'
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text)'
            }}
          />
        </div>

        <div>
          <label className='block text-sm font-medium mb-2' style={{ color: 'var(--muted)' }}>
            Tabela de Preço
          </label>
          <div className='grid grid-cols-2 gap-3'>
            <button
              type='button'
              onClick={() => setPriceType('STANDARD')}
              className='p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all'
              style={
                priceType === 'STANDARD'
                  ? {
                      background: 'rgba(184, 255, 44, 0.18)',
                      borderColor: 'rgba(184, 255, 44, 0.7)',
                      color: 'var(--text)'
                    }
                  : {
                      background: 'var(--surface-2)',
                      borderColor: 'var(--border)',
                      color: 'var(--muted)'
                    }
              }
            >
              <span className='text-sm font-semibold'>Padrão</span>
              <span className='text-xs'>{formatCurrency(priceSettings.standard)}/L</span>
            </button>

            <button
              type='button'
              onClick={() => setPriceType('CUSTOM')}
              className='p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all'
              style={
                priceType === 'CUSTOM'
                  ? {
                      background: 'rgba(184, 255, 44, 0.18)',
                      borderColor: 'rgba(184, 255, 44, 0.7)',
                      color: 'var(--text)'
                    }
                  : {
                      background: 'var(--surface-2)',
                      borderColor: 'var(--border)',
                      color: 'var(--muted)'
                    }
              }
            >
              <div className='flex items-center gap-1'>
                <Tag size={12} />
                <span className='text-sm font-semibold'>Personalizado</span>
              </div>
              <span className='text-xs'>{formatCurrency(priceSettings.custom)}/L</span>
            </button>
          </div>
        </div>

        <div className='flex gap-3 mt-6'>
          <button
            type='button'
            onClick={onClose}
            className='flex-1 py-3 px-4 rounded-xl font-semibold transition-colors'
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text)'
            }}
          >
            Cancelar
          </button>
          <button
            type='button'
            onClick={handleSubmit}
            className='flex-1 py-3 px-4 rounded-xl font-semibold transition-colors shadow-lg'
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-ink)',
              boxShadow: '0 12px 24px -16px rgba(184, 255, 44, 0.55)'
            }}
          >
            Salvar
          </button>
        </div>
      </div>
    </Modal>
  )
}

type AddSaleModalProps = {
  isOpen: boolean
  onClose: () => void
  onSave: (
    liters: number,
    date: string,
    pricePerLiter: number,
    paymentStatus: PaymentStatus
  ) => Promise<void> | void
  currentPrice: number
}

export const AddSaleModal = ({
  isOpen,
  onClose,
  onSave,
  currentPrice
}: AddSaleModalProps) => {
  const [litersInput, setLitersInput] = useState('1')
  const [priceInput, setPriceInput] = useState(String(currentPrice || 0))
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('PRAZO')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const dateInputRef = useRef<HTMLInputElement>(null)

  const parseLiters = (value: string) => {
    const parsed = parseFloat(value.replace(',', '.'))
    if (Number.isNaN(parsed) || parsed <= 0) return 0
    return Math.max(0, parsed)
  }

  const parsePrice = (value: string) => {
    const parsed = parseFloat(value.replace(',', '.'))
    if (Number.isNaN(parsed) || parsed <= 0) return 0
    return Math.max(0, parsed)
  }

  const litersValue = parseLiters(litersInput)
  const priceValue = parsePrice(priceInput)
  const totalValue = litersValue * priceValue

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const formatNumberInput = (value: number) =>
    Number.isNaN(value) ? '0' : value.toFixed(2)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (litersValue <= 0 || priceValue <= 0 || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSave(litersValue, date, priceValue, paymentStatus)
      setLitersInput('1')
      setDate(new Date().toISOString().split('T')[0])
      setPriceInput(formatNumberInput(currentPrice || 0))
      setPaymentStatus('PRAZO')
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleIncrement = () => {
    setLitersInput((prev) => {
      const nextValue = Math.max(1, parseLiters(prev) + 1)
      return String(nextValue)
    })
  }

  const handleDecrement = () => {
    setLitersInput((prev) => {
      const nextValue = Math.max(1, parseLiters(prev) - 1)
      return String(nextValue)
    })
  }

  useEffect(() => {
    if (!isOpen) return
    setLitersInput('1')
    setDate(new Date().toISOString().split('T')[0])
    setPriceInput(formatNumberInput(currentPrice || 0))
    setPaymentStatus('PRAZO')
    const focusTimer = setTimeout(() => {
      dateInputRef.current?.focus()
    }, 120)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, currentPrice, onClose])

  if (!isOpen) return null

  const formattedDate = (() => {
    const [year, month, day] = date.split('-')
    if (!year || !month || !day) return date
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
  })()

  const validationMessage =
    litersValue <= 0
      ? 'Informe um valor de litros maior que zero.'
      : priceValue <= 0
        ? 'Pre\u00e7o por litro deve ser maior que zero.'
        : ''

  const openDatePicker = () => {
    if (dateInputRef.current?.showPicker) {
      dateInputRef.current.showPicker()
    } else {
      dateInputRef.current?.focus()
      dateInputRef.current?.click()
    }
  }

  const isValid = litersValue > 0 && priceValue > 0

  return (
    <div
      data-theme='flat-lime'
      className='fixed inset-0 z-50 flex items-center justify-center px-4 py-6'
      onClick={onClose}
      style={{
        background: 'rgba(11, 15, 20, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}
    >
      <div
        className='w-full max-w-xl rounded-[24px] overflow-hidden flex flex-col max-h-[90vh] border'
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(18, 24, 33, 0.9)',
          borderColor: 'rgba(30, 42, 56, 0.85)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 28px 60px -36px rgba(0, 0, 0, 0.6)'
        }}
      >
        <div
          className='flex items-center justify-between px-5 py-4 border-b'
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          <h3 className='text-lg font-semibold tracking-tight'>
            Nova Venda
          </h3>
          <button
            type='button'
            onClick={onClose}
            className='h-10 w-10 rounded-full flex items-center justify-center transition-colors'
            aria-label='Fechar'
            style={{
              color: 'var(--muted)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form
          id='add-sale-form'
          onSubmit={handleSubmit}
          className='flex-1 overflow-y-auto px-5 pb-5 space-y-5 custom-scrollbar'
          style={{ background: 'transparent' }}
        >
          <div className='space-y-2 mt-2'>
            <div className='relative'>
              <input
                ref={dateInputRef}
                type='date'
                required
                className='absolute inset-0 opacity-0 w-full h-full cursor-pointer'
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <button
                type='button'
                onClick={openDatePicker}
                className='w-full rounded-2xl px-4 py-3 flex items-center justify-between text-left transition-colors'
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)'
                }}
              >
                <div>
                  <p className='text-xs' style={{ color: 'var(--muted)' }}>
                    Data da venda
                  </p>
                  <p className='text-lg font-semibold' style={{ color: 'var(--text)' }}>
                    {formattedDate}
                  </p>
                </div>
                <CalendarDays size={20} style={{ color: 'var(--muted)' }} />
              </button>
            </div>
            <div className='flex gap-2'>
              {[
                { label: 'Hoje', value: new Date() },
                { label: 'Ontem', value: new Date(Date.now() - 86_400_000) }
              ].map((opt) => {
                const iso = opt.value.toISOString().split('T')[0]
                const isActive = date === iso
                return (
                  <button
                    key={opt.label}
                    type='button'
                    onClick={() => setDate(iso)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      isActive ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]' : ''
                    }`}
                    style={
                      isActive
                        ? undefined
                        : { borderColor: 'var(--border)', color: 'var(--muted)', background: 'var(--surface-2)' }
                    }
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className='space-y-2'>
            <p className='text-sm font-medium' style={{ color: 'var(--muted)' }}>
              Quantidade
            </p>
            <div
              className='rounded-[26px] flex items-center px-3 py-3'
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              <button
                type='button'
                onClick={handleDecrement}
                disabled={litersValue <= 1}
                className='h-12 w-12 rounded-2xl border text-slate-900 font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center'
                style={{
                  background: 'var(--accent, var(--primary, #b8ff2c))',
                  borderColor: 'var(--accent, #b8ff2c)'
                }}
              >
                <Minus size={20} />
              </button>
            <div className='flex-1 flex flex-col items-center justify-center gap-1'>
                  <div className='flex items-end gap-2 text-white font-bold'>
                    <input
                      type='number'
                      inputMode='decimal'
                      min='1'
                      step='1'
                      value={litersInput}
                      onFocus={() => setLitersInput('')}
                      onChange={(e) => setLitersInput(e.target.value)}
                      onBlur={() => setLitersInput(String(Math.max(1, parseLiters(litersInput))))}
                      className='w-24 bg-transparent text-center text-3xl font-bold text-white focus:outline-none tabular-nums'
                      aria-label='Litros'
                    />
                    <span className='text-base text-slate-400 font-semibold pb-1'>L</span>
                  </div>
                </div>
              <button
                type='button'
                onClick={handleIncrement}
                className='h-12 w-12 rounded-2xl border text-slate-900 font-bold transition-all active:scale-95 flex items-center justify-center'
                style={{
                  background: 'var(--accent, var(--primary, #b8ff2c))',
                  borderColor: 'var(--accent, #b8ff2c)'
                }}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          <div
            className='rounded-2xl p-4 text-center border'
            style={{
              background:
                'linear-gradient(135deg, rgba(120, 155, 32, 0.5) 0%, rgba(72, 96, 20, 0.55) 100%)',
              borderColor: 'rgba(184, 255, 44, 0.35)'
            }}
          >
            <p className='text-xs' style={{ color: 'rgba(224, 236, 196, 0.7)' }}>
              Total da venda
            </p>
            <p
              className='text-3xl font-bold mt-1 tabular-nums'
              style={{ color: 'var(--accent, #b8ff2c)' }}
            >
              {formatCurrency(totalValue || 0)}
            </p>
          </div>

          <div className='space-y-3'>
            <p className='text-sm font-medium' style={{ color: 'var(--muted)' }}>
              Status do Pagamento
            </p>
            <div className='grid grid-cols-2 gap-3'>
              <button
                type='button'
                onClick={() => setPaymentStatus('PRAZO')}
                className='rounded-2xl border px-4 py-3 text-center transition-all min-h-[72px] flex flex-col justify-center items-center'
                style={
                  paymentStatus === 'PRAZO'
                    ? {
                        background: 'rgba(184, 255, 44, 0.18)',
                        borderColor: 'rgba(184, 255, 44, 0.7)',
                        color: 'var(--text)'
                      }
                    : {
                        background: 'rgba(14, 20, 28, 0.7)',
                        borderColor: 'rgba(42, 56, 72, 0.9)',
                        color: 'var(--text)'
                      }
                }
              >
                <span className='text-base font-semibold'>A Prazo</span>
                <span
                  className='text-xs mt-1'
                  style={{
                    color:
                      paymentStatus === 'PRAZO'
                        ? 'rgba(224, 236, 196, 0.75)'
                        : 'var(--muted)'
                  }}
                >
                  Fica em aberto
                </span>
              </button>
              <button
                type='button'
                onClick={() => setPaymentStatus('AVISTA')}
                className='rounded-2xl border px-4 py-3 text-center transition-all min-h-[72px] flex flex-col justify-center items-center'
                style={
                  paymentStatus === 'AVISTA'
                    ? {
                        background: 'rgba(184, 255, 44, 0.18)',
                        borderColor: 'rgba(184, 255, 44, 0.7)',
                        color: 'var(--text)'
                      }
                    : {
                        background: 'rgba(14, 20, 28, 0.7)',
                        borderColor: 'rgba(42, 56, 72, 0.9)',
                        color: 'var(--text)'
                      }
                }
              >
                <span className='text-base font-semibold'>À vista</span>
                <span
                  className='text-xs mt-1'
                  style={{
                    color:
                      paymentStatus === 'AVISTA'
                        ? 'rgba(224, 236, 196, 0.75)'
                        : 'var(--muted)'
                  }}
                >
                  Pago na hora
                </span>
              </button>
            </div>
          </div>

          {validationMessage && (
            <div className='bg-red-500/10 border border-red-500/25 text-red-200 text-xs px-3 py-2 rounded-xl'>
              {validationMessage}
            </div>
          )}
        </form>

        <div
          className='sticky bottom-0 w-full backdrop-blur px-5 py-4 flex gap-3'
          style={{
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
            background: 'var(--surface)',
            borderTop: '1px solid var(--border)'
          }}
        >
          <button
            type='button'
            onClick={onClose}
            className='flex-1 h-11 rounded-xl font-semibold hover:opacity-90 transition-colors active:scale-95'
            style={{
              background: 'transparent',
              color: 'var(--text)',
              border: '1px solid var(--border)'
            }}
          >
            Cancelar
          </button>
          <button
            type='submit'
            form='add-sale-form'
            disabled={!isValid || isSubmitting}
            className='flex-1 h-11 rounded-xl font-semibold transition-colors active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed'
            style={{
              background:
                'linear-gradient(135deg, rgba(184, 255, 44, 1) 0%, rgba(154, 236, 38, 1) 100%)',
              boxShadow:
                '0 16px 30px -18px rgba(184, 255, 44, 0.55), 0 0 18px rgba(184, 255, 44, 0.2)',
              color: 'var(--accent-ink, #0c1014)'
            }}
          >
            {isSubmitting ? (
              <span className='inline-flex items-center gap-2'>
                <span className='h-4 w-4 rounded-full border-2 border-[var(--accent-ink,#0b0f14)] border-t-transparent animate-spin' />
                Salvando...
              </span>
            ) : (
              'Confirmar'
            )}
          </button>
        </div>
        <p className='text-[11px] text-center pb-3' style={{ color: 'var(--muted)' }}>
          Salva a venda e atualiza o histórico do cliente.
        </p>
      </div>
    </div>
  )
}

type PayDebtModalProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: (amount: number) => void
  clientName: string
  totalValue: number
  clientAvatar?: string
}

export const PayDebtModal = ({
  isOpen,
  onClose,
  onConfirm,
  clientName,
  clientAvatar,
  totalValue
}: PayDebtModalProps) => {
  return (
    <ReceivePaymentModal
      open={isOpen}
      onClose={onClose}
      client={{ name: clientName, avatarUrl: clientAvatar }}
      totalDue={totalValue}
      initialValue={totalValue}
      onConfirm={(value) => onConfirm(value)}
    />
  )
}

type SuccessReceiptModalProps = {
  isOpen: boolean
  onClose: () => void
  onGenerate: () => void
  clientName: string
}

export const SuccessReceiptModal = ({
  isOpen,
  onClose,
  onGenerate,
  clientName
}: SuccessReceiptModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title='Pagamento Registrado!'>
      <div className='text-center space-y-6'>
        <div className='flex justify-center animate-bounce-short'>
          <div
            className='h-20 w-20 rounded-full flex items-center justify-center border-4'
            style={{
              background: 'rgba(184, 255, 44, 0.16)',
              borderColor: 'rgba(184, 255, 44, 0.2)',
              color: 'var(--accent)'
            }}
          >
            <FileText size={40} />
          </div>
        </div>

        <div>
          <h3 className='text-xl font-bold' style={{ color: 'var(--text)' }}>
            Tudo certo!
          </h3>
          <p style={{ color: 'var(--muted)' }}>
            O pagamento de{' '}
            <span className='font-semibold' style={{ color: 'var(--text)' }}>
              {clientName}
            </span>{' '}
            foi salvo com sucesso.
          </p>
          <p className='text-sm mt-2' style={{ color: 'var(--muted)' }}>
            Deseja gerar o comprovante PDF agora?
          </p>
        </div>

        <div className='flex flex-col gap-3'>
          <button
            type='button'
            onClick={onGenerate}
            className='w-full py-3.5 px-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2'
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-ink)',
              boxShadow: '0 12px 24px -16px rgba(184, 255, 44, 0.55)'
            }}
          >
            <Share2 size={20} />
            Abrir Comprovante
          </button>
          <button
            type='button'
            onClick={onClose}
            className='w-full py-3 px-4 font-medium transition-colors'
            style={{ color: 'var(--muted)' }}
          >
            Agora não, obrigado
          </button>
        </div>
      </div>
    </Modal>
  )
}





