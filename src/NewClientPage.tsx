import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Phone, Tag, User, X } from 'lucide-react'
import { PriceSettings, PriceType } from './types'
import './styles/theme-flat.css'

type NewClientPageProps = {
  onSave: (
    name: string,
    phone: string,
    priceType: PriceType,
    avatar?: string
  ) => Promise<void>
  priceSettings: PriceSettings
  existingNames: string[]
}

export const NewClientPage: React.FC<NewClientPageProps> = ({
  onSave,
  priceSettings,
  existingNames
}) => {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [priceType, setPriceType] = useState<PriceType>('STANDARD')
  const [photo, setPhoto] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [translateY, setTranslateY] = useState(120)
  const [isDragging, setIsDragging] = useState(false)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)

  const startYRef = useRef(0)
  const sheetRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const closeTimerRef = useRef<number | null>(null)
  const isAnimatingOutRef = useRef(false)

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
    []
  )

  const formatCurrency = (value: number) => currencyFormatter.format(value || 0)
  const normalizedExistingNames = useMemo(() => {
    return new Set(
      existingNames
        .map((clientName) => clientName.trim().toLowerCase())
        .filter(Boolean)
    )
  }, [existingNames])
  const normalizedName = name.trim().toLowerCase()
  const isDuplicateName =
    normalizedName.length > 0 && normalizedExistingNames.has(normalizedName)

  const handleClose = useCallback(() => {
    if (isAnimatingOutRef.current) return
    isAnimatingOutRef.current = true
    setIsAnimatingOut(true)
    const sheetHeight = sheetRef.current?.getBoundingClientRect().height || 260
    setTranslateY(sheetHeight)
    closeTimerRef.current = window.setTimeout(() => {
      navigate('/', { replace: true })
    }, 220)
  }, [navigate])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const raf = requestAnimationFrame(() => setTranslateY(0))
    const focusTimer = window.setTimeout(() => {
      nameInputRef.current?.focus()
    }, 160)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      cancelAnimationFrame(raf)
      clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleKeyDown)
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
      }
      isAnimatingOutRef.current = false
    }
  }, [handleClose])

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setPhoto(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveClick = async () => {
    if (!name.trim()) return
    if (isDuplicateName) {
      setError('Ja existe um cliente com este nome.')
      return
    }

    setIsLoading(true)
    try {
      await onSave(name.trim(), phone, priceType, photo || undefined)
      handleClose()
    } catch (error) {
      console.error('Error saving client', error)
      alert('Erro ao salvar cliente. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const target = event.target as HTMLElement
    if (target.closest('button')) return
    setIsDragging(true)
    startYRef.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const delta = Math.max(0, event.clientY - startYRef.current)
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

  const backdropOpacity = Math.max(
    0,
    0.6 - Math.min(0.6, (translateY / (sheetRef.current?.offsetHeight || 1)) * 0.45)
  )

  const isSaveDisabled = !name.trim() || isLoading || isDuplicateName
  const duplicateMessage = isDuplicateName
    ? 'Ja existe um cliente com este nome.'
    : null
  const saveButtonStyle = isSaveDisabled
    ? {
        background: 'var(--surface-2)',
        color: 'var(--muted)',
        border: '1px solid var(--border)'
      }
    : {
        background: 'var(--accent)',
        color: 'var(--accent-ink)',
        boxShadow: '0 12px 24px -18px var(--shadow)'
      }

  return (
    <div
      data-theme='flat-lime'
      className='fixed inset-0 z-50 flex items-end justify-center'
    >
      <div
        className='absolute inset-0 transition-opacity'
        style={{
          background: 'rgba(11, 15, 20, 0.6)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          opacity: backdropOpacity
        }}
        onClick={handleClose}
        aria-hidden='true'
      />
      <div
        ref={sheetRef}
        role='dialog'
        aria-modal='true'
        className='relative w-full max-w-2xl mx-auto rounded-t-[28px] border flex flex-col'
        style={{
          background: 'var(--bg)',
          borderColor: 'var(--border)',
          boxShadow: '0 -20px 40px -30px var(--shadow)',
          maxHeight: '85vh',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          transform: `translateY(${translateY}px)`,
          transition: isDragging ? 'none' : 'transform 220ms ease'
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
          <span
            className='h-1.5 w-12 rounded-full'
            style={{ background: 'var(--border)' }}
          />
          <div className='w-full flex items-center justify-between px-5'>
            <h3 className='text-base font-semibold' style={{ color: 'var(--text)' }}>
              Novo cliente
            </h3>
            <button
              type='button'
              onClick={handleClose}
              className='h-10 w-10 rounded-full flex items-center justify-center transition-colors'
              style={{
                background: 'var(--surface-2)',
                color: 'var(--muted)',
                border: '1px solid var(--border)'
              }}
              aria-label='Fechar'
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className='flex-1 overflow-y-auto px-5 pb-5 space-y-5 custom-scrollbar'>
          <div className='flat-card p-4 flex items-center gap-4'>
            <button
              type='button'
              onClick={handlePhotoClick}
              className='relative h-16 w-16 rounded-full flex items-center justify-center overflow-hidden transition-colors'
              style={{
                background: 'var(--surface-2)',
                border: `1px solid ${photo ? 'var(--accent)' : 'var(--border)'}`
              }}
              aria-label='Adicionar foto do cliente'
            >
              {photo ? (
                <img src={photo} alt='Preview' className='w-full h-full object-cover' />
              ) : (
                <Camera size={22} style={{ color: 'var(--muted)' }} />
              )}
              <input
                type='file'
                ref={fileInputRef}
                onChange={handleFileChange}
                accept='image/*'
                className='hidden'
              />
            </button>
            <div className='flex-1'>
              <p className='text-sm font-semibold' style={{ color: 'var(--text)' }}>
                Foto do cliente
              </p>
              <p className='text-xs' style={{ color: 'var(--muted)' }}>
                Toque para adicionar ou trocar
              </p>
            </div>
          </div>

          <div className='space-y-4'>
            <div>
              <label
                className='block text-xs font-semibold uppercase tracking-wide mb-2'
                style={{ color: 'var(--muted)' }}
              >
                Nome do cliente
              </label>
              <div className='relative'>
                <User
                  size={18}
                  className='absolute left-3 top-1/2 -translate-y-1/2'
                  style={{ color: 'var(--muted)' }}
                />
                <input
                  ref={nameInputRef}
                  type='text'
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    if (error) setError(null)
                  }}
                  placeholder='Ex: Joao da Silva'
                  className='flat-input w-full pl-10 pr-4 py-3 text-base outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]'
                  style={{ caretColor: 'var(--accent)' }}
                />
              </div>
              {(duplicateMessage || error) && (
                <div
                  className='mt-2 text-xs font-semibold px-3 py-2 rounded-xl'
                  style={{
                    background: 'rgba(255, 90, 106, 0.12)',
                    border: '1px solid rgba(255, 90, 106, 0.4)',
                    color: 'var(--danger)'
                  }}
                >
                  {duplicateMessage || error}
                </div>
              )}
            </div>

            <div>
              <label
                className='block text-xs font-semibold uppercase tracking-wide mb-2'
                style={{ color: 'var(--muted)' }}
              >
                Telefone / WhatsApp
              </label>
              <div className='relative'>
                <Phone
                  size={18}
                  className='absolute left-3 top-1/2 -translate-y-1/2'
                  style={{ color: 'var(--muted)' }}
                />
                <input
                  type='tel'
                  inputMode='tel'
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder='(00) 00000-0000'
                  className='flat-input w-full pl-10 pr-4 py-3 text-base outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]'
                  style={{ caretColor: 'var(--accent)' }}
                />
              </div>
            </div>
          </div>

          <div>
            <label
              className='block text-xs font-semibold uppercase tracking-wide mb-2'
              style={{ color: 'var(--muted)' }}
            >
              {'Tabela de pre\u00e7o'}
            </label>
            <div className='flat-card p-2 flex gap-2'>
              <button
                type='button'
                onClick={() => setPriceType('STANDARD')}
                className={`flex-1 rounded-2xl px-3 py-2 text-sm font-semibold transition-colors flat-chip ${
                  priceType === 'STANDARD' ? 'is-active' : ''
                }`}
              >
                <span className='block'>Padrao</span>
                <span className='block text-xs font-semibold'>
                  {formatCurrency(priceSettings.standard)}/L
                </span>
              </button>
              <button
                type='button'
                onClick={() => setPriceType('CUSTOM')}
                className={`flex-1 rounded-2xl px-3 py-2 text-sm font-semibold transition-colors flat-chip ${
                  priceType === 'CUSTOM' ? 'is-active' : ''
                }`}
              >
                <span className='flex items-center justify-center gap-1'>
                  <Tag size={12} />
                  Personalizado
                </span>
                <span className='block text-xs font-semibold'>
                  {formatCurrency(priceSettings.custom)}/L
                </span>
              </button>
            </div>
            {priceType === 'CUSTOM' && (
              <p className='text-xs mt-2' style={{ color: 'var(--muted)' }}>
                  {
                    'O valor segue o pre\u00e7o personalizado definido nas configura\u00e7\u00f5es.'
                  }
              </p>
            )}
          </div>
        </div>

        <div
          className='sticky bottom-0 w-full border-t px-5 py-4 flex gap-3'
          style={{
            borderColor: 'var(--border)',
            background: 'rgba(11, 15, 20, 0.92)'
          }}
        >
          <button
            type='button'
            onClick={handleClose}
            className='flex-1 h-11 rounded-xl font-semibold transition-transform active:scale-[0.98]'
            style={{
              background: 'var(--surface-2)',
              color: 'var(--text)',
              border: '1px solid var(--border)'
            }}
          >
            Cancelar
          </button>
          <button
            type='button'
            onClick={handleSaveClick}
            disabled={isSaveDisabled}
            className='flex-1 h-11 rounded-xl font-semibold transition-transform active:scale-[0.98] disabled:cursor-not-allowed'
            style={saveButtonStyle}
          >
            {isLoading ? 'Salvando...' : 'Salvar cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default NewClientPage
