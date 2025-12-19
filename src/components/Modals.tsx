import React, { useState, useRef, useEffect } from 'react'
import {
  X,
  CalendarDays,
  Minus,
  Plus,
  AlertTriangle,
  CheckCircle,
  Camera,
  Trash2,
  FileText,
  Share2,
  Tag
} from 'lucide-react'
import type { Client, PriceType, PriceSettings } from '@/types'

type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in'>
      <div className='w-full max-w-md bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]'>
        <div className='flex items-center justify-between p-4 border-b border-slate-700 bg-slate-850 shrink-0'>
          <h3 className='text-xl font-bold text-white'>{title}</h3>
          <button
            onClick={onClose}
            className='p-1 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors'
          >
            <X size={24} />
          </button>
        </div>
        <div className='p-6 overflow-y-auto custom-scrollbar'>{children}</div>
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
            <div className='h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 shrink-0'>
              <Trash2 size={24} />
            </div>
          )}
          <p className='text-slate-300 text-lg leading-relaxed pt-1'>{message}</p>
        </div>
        <div className='flex gap-3'>
          <button
            type='button'
            onClick={onClose}
            className='flex-1 py-3 px-4 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-colors'
          >
            {cancelText}
          </button>
          <button
            type='button'
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={`flex-1 py-3 px-4 text-white rounded-lg font-semibold transition-colors shadow-lg ${
              isDanger
                ? 'bg-red-600 hover:bg-red-500 shadow-red-900/50'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/50'
            }`}
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
            className='relative h-24 w-24 rounded-full bg-slate-700 border-2 border-dashed border-slate-500 hover:border-blue-500 cursor-pointer flex items-center justify-center overflow-hidden transition-all group'
          >
            {avatar ? (
              <img src={avatar} alt='Preview' className='h-full w-full object-cover' />
            ) : (
              <Camera size={32} className='text-slate-400 group-hover:text-blue-400' />
            )}
            <div className='absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'>
              <span className='text-xs text-white font-medium'>Alterar</span>
            </div>
          </div>
          <p className='text-xs text-slate-500 mt-2'>Toque para adicionar foto</p>
          <input
            type='file'
            ref={fileInputRef}
            onChange={handleFileChange}
            accept='image/*'
            className='hidden'
          />
        </div>

        {error && (
          <div className='bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2'>
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <div>
          <label className='block text-sm font-medium text-slate-400 mb-1'>
            Nome
          </label>
          <input
            type='text'
            required
            autoFocus
            className='w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none'
            placeholder='Ex: Dona Maria'
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError('')
            }}
          />
        </div>

        <div>
          <label className='block text-sm font-medium text-slate-400 mb-1'>
            Telefone (WhatsApp)
          </label>
          <input
            type='tel'
            className='w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none'
            placeholder='DDD + Número'
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div>
          <label className='block text-sm font-medium text-slate-400 mb-2'>
            Tabela de Preço
          </label>
          <div className='grid grid-cols-2 gap-3'>
            <button
              type='button'
              onClick={() => setPriceType('STANDARD')}
              className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                priceType === 'STANDARD'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                  : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'
              }`}
            >
              <span className='text-sm font-semibold'>Padrão</span>
              <span className='text-xs'>{formatCurrency(priceSettings.standard)}/L</span>
            </button>

            <button
              type='button'
              onClick={() => setPriceType('CUSTOM')}
              className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                priceType === 'CUSTOM'
                  ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                  : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'
              }`}
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
            className='flex-1 py-3 px-4 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-colors'
          >
            Cancelar
          </button>
          <button
            type='button'
            onClick={handleSubmit}
            className='flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/50'
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
  onSave: (liters: number, date: string) => void
  currentPrice: number
}

export const AddSaleModal = ({
  isOpen,
  onClose,
  onSave,
  currentPrice
}: AddSaleModalProps) => {
  const [litersInput, setLitersInput] = useState('1')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [translateY, setTranslateY] = useState(100)
  const [isDragging, setIsDragging] = useState(false)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const startYRef = useRef(0)
  const sheetRef = useRef<HTMLDivElement>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const closingFromInsideRef = useRef(false)

  const parseLiters = (value: string) => {
    const parsed = parseFloat(value.replace(',', '.'))
    if (Number.isNaN(parsed) || parsed <= 0) return 1
    return Math.max(1, parsed)
  }

  const litersValue = parseLiters(litersInput)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!Number.isNaN(litersValue) && litersValue > 0) {
      onSave(litersValue, date)
      setLitersInput('1')
      setDate(new Date().toISOString().split('T')[0])
      handleClose()
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

  const calculatedTotal = (litersValue * currentPrice).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })

  useEffect(() => {
    if (!isOpen) return
    closingFromInsideRef.current = false
    setShouldRender(true)
    setTranslateY(100)
    const raf = requestAnimationFrame(() => setTranslateY(0))
    const focusTimer = setTimeout(() => {
      dateInputRef.current?.focus()
    }, 120)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!shouldRender) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [shouldRender])

  useEffect(() => {
    if (isOpen || !shouldRender) return
    if (closingFromInsideRef.current) {
      closingFromInsideRef.current = false
      const timer = setTimeout(() => setShouldRender(false), 0)
      return () => clearTimeout(timer)
    }
    setIsAnimatingOut(true)
    setTranslateY(100)
    const timer = setTimeout(() => {
      setIsAnimatingOut(false)
      setShouldRender(false)
    }, 220)
    return () => clearTimeout(timer)
  }, [isOpen, shouldRender])

  const handleClose = () => {
    if (isAnimatingOut) return
    closingFromInsideRef.current = true
    setIsAnimatingOut(true)
    setTranslateY(100)
    setTimeout(() => {
      setIsAnimatingOut(false)
      onClose()
    }, 220)
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button')) return
    setIsDragging(true)
    startYRef.current = e.clientY
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const delta = Math.max(0, e.clientY - startYRef.current)
    setTranslateY(delta)
  }

  const handlePointerUp = () => {
    if (!isDragging) return
    setIsDragging(false)
    const sheetHeight = sheetRef.current?.getBoundingClientRect().height || 1
    if (translateY > sheetHeight * 0.25) {
      handleClose()
      return
    }
    setTranslateY(0)
  }

  if (!shouldRender) return null

  const backdropOpacity = Math.max(
    0,
    0.6 - Math.min(0.6, (translateY / (sheetRef.current?.offsetHeight || 1)) * 0.45)
  )

  return (
    <div className='fixed inset-0 z-50 flex items-end justify-center'>
      <div
        className='absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity'
        style={{ opacity: backdropOpacity }}
        onClick={handleClose}
        aria-hidden='true'
      />
      <div
        ref={sheetRef}
        className='relative w-full max-w-2xl mx-auto bg-slate-900/95 border border-slate-800 rounded-t-[28px] shadow-2xl flex flex-col'
        style={{
          maxHeight: '75vh',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          transform: `translateY(${translateY}px)`,
          transition: isDragging ? 'none' : 'transform 200ms ease'
        }}
      >
        <div
          className='pt-4 pb-3 flex flex-col items-center gap-3 cursor-grab'
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none' }}
        >
          <span className='h-1.5 w-12 rounded-full bg-slate-700/70' />
          <div className='w-full flex items-center justify-between px-5'>
            <h3 className='text-base font-semibold text-white'>Adicionar venda</h3>
            <button
              type='button'
              onClick={handleClose}
              className='h-11 w-11 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors'
              aria-label='Fechar'
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form
          id='add-sale-form'
          onSubmit={handleSubmit}
          className='flex-1 overflow-y-auto px-5 pb-5 space-y-5 custom-scrollbar'
        >
          <div>
            <label className='block text-sm font-medium text-slate-400 mb-1'>
              Data
            </label>
            <div className='relative'>
              <CalendarDays size={16} className='absolute left-3 top-3.5 text-slate-500' />
              <input
                ref={dateInputRef}
                type='date'
                required
                className='w-full pl-9 pr-3 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none'
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-slate-400 mb-1'>
              Litros
            </label>
            <div className='flex items-center gap-3'>
              <button
                type='button'
                onClick={handleDecrement}
                disabled={litersValue <= 1}
                className='h-12 w-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center'
              >
                <Minus size={20} />
              </button>

              <div className='flex-1 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center gap-2 text-white font-bold text-lg'>
                <input
                  type='number'
                  inputMode='decimal'
                  min='1'
                  step='1'
                  value={litersInput}
                  onFocus={() => setLitersInput('')}
                  onChange={(e) => setLitersInput(e.target.value)}
                  onBlur={() => setLitersInput(String(parseLiters(litersInput)))}
                  className='w-20 bg-transparent text-center text-white font-bold text-lg focus:outline-none tabular-nums'
                  aria-label='Litros'
                />
                <span className='text-sm text-slate-400'>L</span>
              </div>

              <button
                type='button'
                onClick={handleIncrement}
                className='h-12 w-12 rounded-2xl bg-slate-900 border border-slate-800 text-blue-300 hover:bg-slate-800 hover:text-blue-200 transition-colors active:scale-95 flex items-center justify-center'
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          <div className='bg-slate-900/60 p-4 rounded-2xl border border-slate-800 text-center'>
            <p className='text-sm text-slate-400'>Total a pagar</p>
            <p className='text-3xl font-bold text-emerald-400 mt-1'>
              {calculatedTotal}
            </p>
            <p className='text-xs text-slate-500 mt-1'>
              ({currentPrice.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              })}{' '}
              por litro)
            </p>
          </div>
        </form>

        <div
          className='sticky bottom-0 w-full border-t border-slate-800 bg-slate-900/95 backdrop-blur px-5 py-4 flex gap-3'
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            type='button'
            onClick={handleClose}
            className='flex-1 h-11 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700 transition-colors active:scale-95'
          >
            Cancelar
          </button>
          <button
            type='submit'
            form='add-sale-form'
            className='flex-1 h-11 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-500 transition-colors active:scale-95'
          >
            Salvar
          </button>
        </div>
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
}

const PayDebtModalLegacy = ({
  isOpen,
  onClose,
  onConfirm,
  clientName,
  totalValue
}: PayDebtModalProps) => {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setAmount(totalValue > 0 ? totalValue.toFixed(2) : '')
      setError('')
    }
  }, [isOpen, totalValue])

  const handleConfirm = () => {
    const parsed = parseFloat(amount.replace(',', '.'))
    const normalized = Math.min(totalValue, isNaN(parsed) ? 0 : parsed)

    if (normalized <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }

    onConfirm(normalized)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title='Confirmar Pagamento'>
      <div className='space-y-6'>
        <div className='flex justify-center'>
          <div className='h-16 w-16 bg-green-500/20 rounded-full flex items-center justify-center text-green-500'>
            <CheckCircle size={32} />
          </div>
        </div>

        <div className='text-center'>
          <p className='text-slate-300 mb-2'>
            Total a receber de <span className='text-white font-bold'>{clientName}</span>:
          </p>
          <p className='text-4xl font-bold text-white'>
            {totalValue.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            })}
          </p>
          <p className='text-xs text-slate-500 mt-1'>
            Ajuste o valor caso o pagamento seja parcial.
          </p>
        </div>

        <div className='space-y-2'>
          <label className='block text-sm font-medium text-slate-300'>
            Valor a receber
          </label>
          <input
            type='number'
            min='0'
            max={totalValue}
            step='0.01'
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              setError('')
            }}
            className='w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none'
            placeholder='Informe o valor recebido'
          />
          <p className='text-xs text-slate-500'>
            Valor restante permanece como débito em aberto no histórico.
          </p>
          {error && (
            <div className='bg-red-500/10 border border-red-500/30 text-red-300 text-sm p-2 rounded-lg'>
              {error}
            </div>
          )}
        </div>

        <div className='bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-left flex gap-3'>
          <AlertTriangle className='text-yellow-500 shrink-0' size={20} />
          <p className='text-sm text-yellow-200/80'>
            Ao confirmar, registramos o pagamento e, se o valor for menor que o saldo, manteremos o restante em aberto no <strong>Histórico</strong>.
          </p>
        </div>

        <div className='flex gap-3 mt-6'>
          <button
            type='button'
            onClick={onClose}
            className='flex-1 py-3 px-4 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-colors'
          >
            Cancelar
          </button>
          <button
            type='button'
            onClick={handleConfirm}
            className='flex-1 py-3 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-500 transition-colors shadow-lg shadow-green-900/50'
          >
            Receber
          </button>
        </div>
      </div>
    </Modal>
  )
}

export const PayDebtModal = ({
  isOpen,
  onClose,
  onConfirm,
  clientName,
  totalValue
}: PayDebtModalProps) => {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [translateY, setTranslateY] = useState(100)
  const [isDragging, setIsDragging] = useState(false)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const startYRef = useRef(0)
  const sheetRef = useRef<HTMLDivElement>(null)
  const amountInputRef = useRef<HTMLInputElement>(null)
  const closingFromInsideRef = useRef(false)

  useEffect(() => {
    if (isOpen) {
      setAmount(totalValue > 0 ? totalValue.toFixed(2) : '')
      setError('')
    }
  }, [isOpen, totalValue])

  useEffect(() => {
    if (!isOpen) return
    closingFromInsideRef.current = false
    setShouldRender(true)
    setTranslateY(100)
    const raf = requestAnimationFrame(() => setTranslateY(0))
    const focusTimer = setTimeout(() => {
      amountInputRef.current?.focus()
    }, 140)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!shouldRender) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [shouldRender])

  useEffect(() => {
    if (isOpen || !shouldRender) return
    if (closingFromInsideRef.current) {
      closingFromInsideRef.current = false
      const timer = setTimeout(() => setShouldRender(false), 0)
      return () => clearTimeout(timer)
    }
    setIsAnimatingOut(true)
    setTranslateY(100)
    const timer = setTimeout(() => {
      setIsAnimatingOut(false)
      setShouldRender(false)
    }, 220)
    return () => clearTimeout(timer)
  }, [isOpen, shouldRender])

  const handleClose = () => {
    if (isAnimatingOut) return
    closingFromInsideRef.current = true
    setIsAnimatingOut(true)
    setTranslateY(100)
    setTimeout(() => {
      setIsAnimatingOut(false)
      onClose()
    }, 220)
  }

  const handleConfirm = () => {
    const parsed = parseFloat(amount.replace(',', '.'))
    const normalized = Math.min(totalValue, isNaN(parsed) ? 0 : parsed)

    if (normalized <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }

    onConfirm(normalized)
    handleClose()
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button')) return
    setIsDragging(true)
    startYRef.current = e.clientY
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const delta = Math.max(0, e.clientY - startYRef.current)
    setTranslateY(delta)
  }

  const handlePointerUp = () => {
    if (!isDragging) return
    setIsDragging(false)
    const sheetHeight = sheetRef.current?.getBoundingClientRect().height || 1
    if (translateY > sheetHeight * 0.25) {
      handleClose()
      return
    }
    setTranslateY(0)
  }

  if (!shouldRender) return null

  const backdropOpacity = Math.max(
    0,
    0.6 - Math.min(0.6, (translateY / (sheetRef.current?.offsetHeight || 1)) * 0.45)
  )

  return (
    <div className='fixed inset-0 z-50 flex items-end justify-center'>
      <div
        className='absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity'
        style={{ opacity: backdropOpacity }}
        onClick={handleClose}
        aria-hidden='true'
      />
      <div
        ref={sheetRef}
        className='relative w-full max-w-2xl mx-auto bg-slate-900/95 border border-slate-800 rounded-t-[28px] shadow-2xl flex flex-col'
        style={{
          maxHeight: '75vh',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          transform: `translateY(${translateY}px)`,
          transition: isDragging ? 'none' : 'transform 200ms ease'
        }}
      >
        <div
          className='pt-4 pb-3 flex flex-col items-center gap-3 cursor-grab'
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none' }}
        >
          <span className='h-1.5 w-12 rounded-full bg-slate-700/70' />
          <div className='w-full flex items-center justify-between px-5'>
            <h3 className='text-base font-semibold text-white'>Receber</h3>
            <button
              type='button'
              onClick={handleClose}
              className='h-11 w-11 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors'
              aria-label='Fechar'
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className='flex-1 overflow-y-auto px-5 pb-5 space-y-5 custom-scrollbar'>
          <div className='flex justify-center'>
            <div className='h-14 w-14 bg-green-500/15 rounded-full flex items-center justify-center text-green-400 border border-green-500/20'>
              <CheckCircle size={28} />
            </div>
          </div>

          <div className='text-center space-y-1'>
            <p className='text-slate-300 text-sm'>
              Total a receber de <span className='text-white font-semibold'>{clientName}</span>
            </p>
            <p className='text-3xl font-bold text-white'>
              {totalValue.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              })}
            </p>
            <p className='text-xs text-slate-500'>
              Ajuste o valor caso o pagamento seja parcial.
            </p>
          </div>

          <div className='space-y-2'>
            <label className='block text-sm font-medium text-slate-300'>
              Valor a receber
            </label>
            <input
              ref={amountInputRef}
              type='number'
              min='0'
              max={totalValue}
              step='0.01'
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                setError('')
              }}
              className='w-full p-3 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none'
              placeholder='Informe o valor recebido'
            />
            <p className='text-xs text-slate-500'>
              Valor restante permanece como d‚bito em aberto no hist¢rico.
            </p>
            {error && (
              <div className='bg-red-500/10 border border-red-500/30 text-red-300 text-sm p-2 rounded-lg'>
                {error}
              </div>
            )}
          </div>

          <div className='bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-left flex gap-3'>
            <AlertTriangle className='text-yellow-500 shrink-0' size={20} />
            <p className='text-sm text-yellow-200/80'>
              Ao confirmar, registramos o pagamento e, se o valor for menor que o saldo,
              manteremos o restante em aberto no <strong>Hist¢rico</strong>.
            </p>
          </div>
        </div>

        <div
          className='sticky bottom-0 w-full border-t border-slate-800 bg-slate-900/95 backdrop-blur px-5 py-4 flex gap-3'
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            type='button'
            onClick={handleClose}
            className='flex-1 h-11 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-700 transition-colors active:scale-95'
          >
            Cancelar
          </button>
          <button
            type='button'
            onClick={handleConfirm}
            className='flex-1 h-11 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-500 transition-colors active:scale-95'
          >
            Receber
          </button>
        </div>
      </div>
    </div>
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
          <div className='h-20 w-20 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-500 border-4 border-blue-500/10'>
            <FileText size={40} />
          </div>
        </div>

        <div>
          <h3 className='text-xl font-bold text-white mb-2'>Tudo certo!</h3>
          <p className='text-slate-400'>
            O pagamento de <span className='text-white font-semibold'>{clientName}</span> foi salvo com sucesso.
          </p>
          <p className='text-slate-500 text-sm mt-2'>
            Deseja gerar o comprovante PDF agora?
          </p>
        </div>

        <div className='flex flex-col gap-3'>
          <button
            type='button'
            onClick={onGenerate}
            className='w-full py-3.5 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2'
          >
            <Share2 size={20} />
            Abrir Comprovante
          </button>
          <button
            type='button'
            onClick={onClose}
            className='w-full py-3 px-4 text-slate-400 font-medium hover:text-white transition-colors'
          >
            Agora não, obrigado
          </button>
        </div>
      </div>
    </Modal>
  )
}



