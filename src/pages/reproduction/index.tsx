import React, { useMemo, useState } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleDot,
  Image,
  MoreVertical,
  Plus,
  Search,
  X
} from 'lucide-react'
import calfIcon from '../../../assets/icon/icon-bezerro-3.svg'
import cowIcon from '../../../assets/icon/icon-vaca.svg'

import type { CalvingEvent, CalvingSex, Cow } from '@/types'
import { Modal } from '@/components/Modal'
import { offlineWrites } from '@/services/offlineWrites'
import { formatTimeSince } from '@/utils/time'
import '../../styles/theme-flat.css'

type ReproductionPageProps = {
  cows: Cow[]
  calvings: CalvingEvent[]
}

const iconColor = '#103b2d'

const MaskIcon = ({
  src,
  size = 64,
  color = iconColor
}: {
  src: string
  size?: number
  color?: string
}) => (
  <div
    aria-hidden
    style={{
      display: 'block',
      margin: '0 auto',
      width: size,
      height: size,
      background: color,
      WebkitMaskImage: `url(${src})`,
      WebkitMaskRepeat: 'no-repeat',
      WebkitMaskSize: 'contain',
      WebkitMaskPosition: 'center',
      maskImage: `url(${src})`,
      maskRepeat: 'no-repeat',
      maskSize: 'contain',
      maskPosition: 'center'
    }}
  />
)

const formatDateBR = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('pt-BR')
}

const toDateTime = (dateStr: string) => {
  const now = new Date()
  const [year, month, day] = dateStr.split('-').map(Number)
  if ([year, month, day].some((v) => Number.isNaN(v))) return now.toISOString()
  const dt = new Date(
    year,
    (month || 1) - 1,
    day || 1,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds()
  )
  return dt.toISOString()
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Falha ao ler imagem'))
    reader.readAsDataURL(file)
  })

const compressImageDataUrl = async (
  dataUrl: string,
  opts: { maxDim?: number; quality?: number } = {}
): Promise<string> => {
  const maxDim = opts.maxDim ?? 1024
  const quality = opts.quality ?? 0.78

  // Se não for imagem, retorna como está.
  if (!dataUrl.startsWith('data:image/')) return dataUrl

  const img = new Image()
  const loaded = new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Imagem inválida'))
  })
  img.src = dataUrl
  try {
    await loaded
  } catch (err) {
    console.warn('Falha ao carregar imagem para compressao, usando original', err)
    return dataUrl
  }

  const { width, height } = img
  if (!width || !height) return dataUrl

  const scale = Math.min(1, maxDim / Math.max(width, height))
  const targetW = Math.max(1, Math.round(width * scale))
  const targetH = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl

  try {
    ctx.drawImage(img, 0, 0, targetW, targetH)
  } catch (err) {
    console.warn('Falha ao reduzir imagem, usando original', err)
    return dataUrl
  }

  // JPEG costuma ficar bem menor e é o esperado para foto.
  try {
    return canvas.toDataURL('image/jpeg', quality)
  } catch {
    return dataUrl
  }
}

const getEventPhotos = (event?: CalvingEvent | null) => {
  if (!event) return []
  if (Array.isArray(event.photos) && event.photos.length) {
    return event.photos.filter((p): p is string => Boolean(p))
  }
  return event?.photoDataUrl ? [event.photoDataUrl].filter(Boolean) : []
}

const preparePhotoFromFile = async (file: File): Promise<string> => {
  const mime = (file.type || '').toLowerCase()

  if (mime.includes('heic') || mime.includes('heif')) {
    return readFileAsDataUrl(file)
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const img = new Image()
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Imagem invalida'))
    })
    img.src = objectUrl
    await loaded

    const { width, height } = img
    if (!width || !height) throw new Error('Sem dimensoes')

    const maxDim = 1024
    const quality = 0.78
    const scale = Math.min(1, maxDim / Math.max(width, height))
    const targetW = Math.max(1, Math.round(width * scale))
    const targetH = Math.max(1, Math.round(height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas nao disponivel')

    ctx.drawImage(img, 0, 0, targetW, targetH)
    return canvas.toDataURL('image/jpeg', quality)
  } catch (err) {
    console.warn('Compressao via object URL falhou, fallback para FileReader', err)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }

  const fallback = await readFileAsDataUrl(file)
  try {
    return await compressImageDataUrl(fallback)
  } catch (err) {
    console.warn('Falha ao reduzir imagem no fallback', err)
    return fallback
  }
}


const sexLabel = (sex: CalvingSex) => (sex === 'MACHO' ? 'Macho' : 'Fêmea')


const dividerColor = 'var(--border)'

const InfoChip = ({
  label,
  tone = 'muted'
}: {
  label: string
  tone?: 'muted' | 'accent'
}) => (
  <span
    className='inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold leading-none'
    style={
      tone === 'accent'
        ? {
            background: 'rgba(149, 193, 31, 0.16)',
            borderColor: 'rgba(149, 193, 31, 0.4)',
            color: 'var(--text)'
          }
        : { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' }
    }
  >
    {label}
  </span>
)

const CowIdentityStrip = ({
  cow,
  idLabel,
  breed,
  status,
  isEditingName,
  nameDraft,
  onNameChange,
  onSaveName,
  onCancelEdit,
  canSaveName,
  savingName,
  onAvatarClick
}: {
  cow: Cow
  idLabel?: string | null
  breed?: string | null
  status?: string | null
  isEditingName: boolean
  nameDraft: string
  onNameChange: (value: string) => void
  onSaveName: () => void
  onCancelEdit: () => void
  canSaveName: boolean
  savingName: boolean
  onAvatarClick?: () => void
}) => {
  const initial = (cow.name || '?').trim().charAt(0).toUpperCase() || '?'

  return (
    <div
      className='rounded-3xl border p-4 flex items-center gap-4'
      style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: '0 12px 30px -26px var(--shadow)' }}
    >
      <button
        type='button'
        onClick={onAvatarClick}
        className='h-[76px] w-[76px] shrink-0 rounded-2xl border flex items-center justify-center overflow-hidden'
        style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--primary)' }}
      >
        {cow.photoDataUrl ? (
          <img src={cow.photoDataUrl} alt={cow.name} className='h-full w-full object-cover' />
        ) : (
          <span className='text-2xl font-bold'>{initial}</span>
        )}
      </button>

      <div className='flex-1 min-w-0 flex flex-col justify-center gap-2 self-center'>
        {isEditingName ? (
          <>
            <input
              value={nameDraft}
              onChange={(e) => onNameChange(e.target.value)}
              className='w-full h-11 rounded-xl border px-3 outline-none'
              placeholder='Nome da vaca'
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
            />
            <div className='flex flex-wrap gap-2'>
              <button
                type='button'
                onClick={onSaveName}
                disabled={!canSaveName || savingName}
                className='h-10 px-4 rounded-xl text-sm font-semibold border transition disabled:opacity-60'
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
              >
                {savingName ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                type='button'
                onClick={onCancelEdit}
                className='h-10 px-3 rounded-xl text-sm font-semibold border transition hover:brightness-110'
                style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted)' }}
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className='text-xl font-semibold leading-tight truncate' style={{ color: 'var(--text)' }}>
              {cow.name}
            </div>
            <div className='flex flex-wrap gap-2'>
              {idLabel ? <InfoChip label={`ID ${idLabel}`} /> : null}
              {breed ? <InfoChip label={breed} /> : null}
              {status ? <InfoChip label={status} tone='accent' /> : null}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const BirthItemRow = ({
  event,
  isFirst,
  onOpen,
  onOpenMenu
}: {
  event: CalvingEvent
  isFirst: boolean
  onOpen: () => void
  onOpenMenu: () => void
}) => {
  const timeSinceLabel = formatTimeSince(event.date)

  return (
    <div
      className='w-full flex items-center gap-3 px-4 py-3 text-left'
      style={{
        borderTop: isFirst ? 'none' : `1px solid ${dividerColor}`
      }}
    >
      <button type='button' onClick={onOpen} className='flex-1 min-w-0 text-left rounded-xl py-1 transition hover:opacity-80' style={{ color: 'var(--text)' }}>
        <span className='flex flex-wrap items-center gap-2 text-sm font-semibold'>
          {formatDateBR(event.date)}
          <span className='text-xs font-normal' style={{ color: 'var(--muted)' }}>{`· ${timeSinceLabel}`}</span>
        </span>
      </button>
      <span
        className='inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold'
        style={{
          background: event.sex === 'FEMEA' ? 'var(--accent-soft)' : 'color-mix(in srgb, var(--tertiary) 10%, white)',
          color: event.sex === 'FEMEA' ? 'var(--primary)' : 'var(--tertiary)',
          border: '1px solid var(--border)'
        }}
      >
        {sexLabel(event.sex)}
      </span>
      <button
        type='button'
        onClick={onOpenMenu}
        aria-label='Ações do parto'
        className='h-9 w-9 rounded-full flex items-center justify-center transition hover:brightness-95'
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
      >
        <MoreVertical size={16} />
      </button>
    </div>
  )
}

export function ReproductionPage({ cows, calvings }: ReproductionPageProps) {
  const [search, setSearch] = useState('')
  const [selectedCow, setSelectedCow] = useState<Cow | null>(null)
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false)
  const [isNewCowOpen, setIsNewCowOpen] = useState(false)
  const [isNewCalvingOpen, setIsNewCalvingOpen] = useState(false)
  const [editingCalving, setEditingCalving] = useState<CalvingEvent | null>(null)

  const calvingsByCow = useMemo(() => {
    const map = new Map<string, CalvingEvent[]>()
    for (const ev of calvings) {
      const list = map.get(ev.cowId) || []
      list.push(ev)
      map.set(ev.cowId, list)
    }
    for (const [cowId, list] of map.entries()) {
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      map.set(cowId, list)
    }
    return map
  }, [calvings])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const withMeta = cows
      .map((cow) => {
        const list = calvingsByCow.get(cow.id) || []
        const last = list[0]
        return {
          cow,
          lastDate: last ? new Date(last.date).getTime() : 0,
          lastEvent: last,
          count: list.length
        }
      })
      .filter((r) => (q ? r.cow.name.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        if (b.lastDate !== a.lastDate) return b.lastDate - a.lastDate
        return a.cow.name.localeCompare(b.cow.name)
      })
    return withMeta
  }, [cows, calvingsByCow, search])

  const calvingsLast30Days = useMemo(() => {
    const now = Date.now()
    const cutoff = now - 30 * 24 * 60 * 60 * 1000

    const validCowIds = new Set(cows.map((cow) => cow.id))

    return calvings.reduce((count, calving) => {
      if (!validCowIds.has(calving.cowId)) return count
      const time = new Date(calving.date).getTime()
      if (Number.isNaN(time)) return count
      return time >= cutoff ? count + 1 : count
    }, 0)
  }, [calvings, cows])

  const openCow = (cow: Cow) => {
    setSelectedCow(cow)
  }

  const cowEvents = useMemo(() => {
    if (!selectedCow) return []
    return calvingsByCow.get(selectedCow.id) || []
  }, [selectedCow, calvingsByCow])

  return (
    <div className='max-w-2xl mx-auto space-y-4 px-1'>
      {!selectedCow && (
        <>
      <section
        className='relative overflow-hidden rounded-[28px] border p-5 sm:p-6'
        style={{ background: 'var(--primary)', borderColor: 'var(--primary-2)', color: '#ffffff', boxShadow: '0 18px 44px -30px var(--shadow)' }}
      >
        <div className='absolute -right-12 -top-16 h-48 w-48 rounded-full border-[22px] opacity-10' style={{ borderColor: 'var(--accent)' }} />
        <div className='relative flex items-start justify-between gap-4'>
          <div className='flex items-center gap-3 min-w-0'>
            <div className='h-12 w-12 rounded-2xl flex items-center justify-center shrink-0' style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
              <CalendarDays size={21} />
            </div>
            <div className='min-w-0'>
              <h1 className='text-xl font-bold leading-tight'>Reprodução</h1>
              <p className='mt-1 text-xs sm:text-sm' style={{ color: 'rgba(255,255,255,0.72)' }}>
                Acompanhe o rebanho e o histórico de nascimentos.
              </p>
            </div>
          </div>
          <button type='button' onClick={() => { setEditingCalving(null); setIsNewMenuOpen(true) }} className='inline-flex items-center gap-2 px-4 h-11 rounded-full text-sm font-semibold transition hover:brightness-105 shrink-0' style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
            <Plus size={16} />
            Novo
          </button>
        </div>
        <div className='relative mt-6 grid grid-cols-3 gap-2 sm:gap-3'>
          <div className='rounded-2xl p-3' style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className='flex items-center gap-1.5 text-[10px] sm:text-xs' style={{ color: 'rgba(255,255,255,0.72)' }}>
              <MaskIcon src={cowIcon} size={15} color='var(--accent)' />
              Vacas
            </div>
            <div className='mt-2 text-xl sm:text-2xl font-bold'>{cows.length}</div>
          </div>
          <div className='rounded-2xl p-3' style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className='flex items-center gap-1.5 text-[10px] sm:text-xs' style={{ color: 'rgba(255,255,255,0.72)' }}>
              <MaskIcon src={calfIcon} size={15} color='var(--accent)' />
              Partos no total
            </div>
            <div className='mt-2 text-xl sm:text-2xl font-bold'>{calvings.filter((event) => cows.some((cow) => cow.id === event.cowId)).length}</div>
          </div>
          <div className='rounded-2xl p-3' style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className='flex items-center gap-1.5 text-[10px] sm:text-xs' style={{ color: 'rgba(255,255,255,0.72)' }}>
              <CalendarDays size={15} style={{ color: 'var(--accent)' }} />
              Últimos 30 dias
            </div>
            <div className='mt-2 text-xl sm:text-2xl font-bold'>{calvingsLast30Days}</div>
          </div>
        </div>
      </section>

      <div className='mt-4 relative'>
        <Search size={16} className='absolute left-3 top-1/2 -translate-y-1/2' style={{ color: 'var(--muted)' }} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder='Buscar vaca pelo nome...'
          className='w-full h-11 pl-10 pr-3 rounded-xl border outline-none'
          style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
        />
      </div>
      <div className='space-y-2'>
        {rows.length === 0 ? (
          <div
            className='rounded-2xl p-5 border text-sm'
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
            Nenhuma vaca encontrada. Toque em <b>Novo</b> para cadastrar o primeiro.
          </div>
        ) : (
          rows.map((r) => {
            const lastEvent = r.lastEvent
            const lastDateLabel = lastEvent ? formatDateBR(lastEvent.date) : null
            const lastSexLabel = lastEvent ? sexLabel(lastEvent.sex) : null
            const elapsedLabel = lastEvent ? formatTimeSince(lastEvent.date) : null

            return (
              <button
                key={r.cow.id}
                type="button"
                onClick={() => openCow(r.cow)}
                className="w-full text-left rounded-3xl p-4 border transition hover:-translate-y-0.5"
                style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "0 10px 30px -27px var(--shadow)" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-12 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 font-bold" style={{ background: "var(--surface-2)", color: "var(--primary)" }}>
                      {r.cow.photoDataUrl ? (
                        <img src={r.cow.photoDataUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span>{r.cow.name.trim().charAt(0).toUpperCase() || '?'}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>
                        {r.cow.name}
                      </div>
                      <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                        {lastEvent
                          ? `Último parto: ${lastDateLabel}${lastSexLabel ? ` · ${lastSexLabel}` : ''}`
                          : 'Nenhum parto registrado'}
                      </div>
                      {elapsedLabel && (
                        <div className="text-xs font-semibold mt-1" style={{ color: "var(--primary)" }}>
                          {elapsedLabel}
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    className="h-10 min-w-10 px-2 rounded-full border flex items-center justify-center"
                    style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
                  >
                    <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                      {r.count}
                    </span>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

        </>
      )}
      <Modal
        open={isNewMenuOpen}
        title='Novo'
        onClose={() => setIsNewMenuOpen(false)}
        closeOnBackdrop
      >
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
          <button
            type='button'
            onClick={() => {
              setIsNewMenuOpen(false)
              setEditingCalving(null)
              setIsNewCalvingOpen(true)
            }}
            className='w-full rounded-3xl border flex flex-col items-center justify-center text-center transition hover:brightness-110'
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
              padding: '18px 16px',
              minHeight: 148,
              boxShadow: '0 16px 40px -32px var(--shadow)'
            }}
          >
            <div className='flex flex-col items-center gap-px'>
              <MaskIcon src={calfIcon} size={80} />
              <div className='space-y-1'>
                <div className='text-base font-semibold'>Parto</div>
                <div className='text-xs' style={{ color: 'var(--muted)' }}>
                  Registrar parto
                </div>
              </div>
            </div>
          </button>
          <button
            type='button'
            onClick={() => {
              setIsNewMenuOpen(false)
              setIsNewCowOpen(true)
            }}
            className='w-full rounded-3xl border flex flex-col items-center justify-center text-center transition hover:brightness-110'
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
              padding: '18px 16px',
              minHeight: 148,
              boxShadow: '0 16px 40px -32px var(--shadow)'
            }}
          >
            <div className='flex flex-col items-center gap-px'>
              <MaskIcon src={cowIcon} size={80} />
              <div className='space-y-1'>
                <div className='text-base font-semibold'>Vaca</div>
                <div className='text-xs' style={{ color: 'var(--muted)' }}>
                  Cadastrar sem parto
                </div>
              </div>
            </div>
          </button>
        </div>
      </Modal>

      {selectedCow ? (
        <CowDetailsPage
          cow={cows.find((item) => item.id === selectedCow.id) || selectedCow}
          events={cowEvents}
          onClose={() => setSelectedCow(null)}
          onEditCalving={(event) => {
            setEditingCalving(event)
            setIsNewCalvingOpen(true)
          }}
          onNewCalving={() => {
            setEditingCalving(null)
            setIsNewCalvingOpen(true)
          }}
        />
      ) : null}

      <CalvingModal
        open={isNewCalvingOpen}
        cows={cows}
        initialCowId={editingCalving?.cowId || selectedCow?.id || null}
        editing={editingCalving}
        onClose={() => {
          setIsNewCalvingOpen(false)
          setEditingCalving(null)
        }}
        onSaved={() => {
          setIsNewCalvingOpen(false)
          setEditingCalving(null)
        }}
      />

      <NewCowModal
        open={isNewCowOpen}
        onClose={() => setIsNewCowOpen(false)}
        onSaved={(cow) => {
          setIsNewCowOpen(false)
          openCow(cow)
        }}
      />
    </div>
  )
}

function CowDetailsPage({
  cow,
  events,
  onClose,
  onNewCalving,
  onEditCalving
}: {
  cow: Cow
  events: CalvingEvent[]
  onClose: () => void
  onNewCalving: () => void
  onEditCalving: (ev: CalvingEvent) => void
}) {
  const [nameDraft, setNameDraft] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [deletingCow, setDeletingCow] = useState(false)
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [photoViewer, setPhotoViewer] = useState<{
    src: string | null
    title: string
    event?: CalvingEvent
    type?: 'cow' | 'event'
  }>({
    src: null,
    title: ''
  })
  const [activeEventMenu, setActiveEventMenu] = useState<CalvingEvent | null>(null)
  const [galleryEvent, setGalleryEvent] = useState<CalvingEvent | null>(null)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)
  const [isCowPhotoPickerOpen, setIsCowPhotoPickerOpen] = useState(false)
  const cowPhotoCameraInputRef = React.useRef<HTMLInputElement>(null)
  const cowPhotoGalleryInputRef = React.useRef<HTMLInputElement>(null)
  const toastTimeoutRef = React.useRef<number | null>(null)
  const [toast, setToast] = useState<{ message: string; tone?: 'success' | 'error' } | null>(null)

  React.useEffect(() => {
    setNameDraft(cow?.name || '')
    setIsEditingName(false)
    setDeleteInput('')
    setIsActionsOpen(false)
  }, [cow?.id, cow?.name])

  React.useEffect(
    () => () => {
      if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current)
    },
    []
  )

  React.useEffect(() => {
    if (!galleryEvent) return
    const latest = events.find((ev) => ev.id === galleryEvent.id)
    if (!latest) {
      setGalleryEvent(null)
      return
    }
    if (latest !== galleryEvent) {
      setGalleryEvent(latest)
    }
  }, [events, galleryEvent])

  const showToast = (message: string, tone: 'success' | 'error' = 'success') => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current)
    setToast({ message, tone })
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 2600)
  }

  const canSaveName = cow && nameDraft.trim() && nameDraft.trim() !== cow.name
  const canDelete = cow && deleteInput.trim().toLowerCase() === cow.name.trim().toLowerCase()

  const saveName = async () => {
    if (!cow || !canSaveName) return
    const nextName = nameDraft.trim()
    if (!nextName) return
    setSavingName(true)
    try {
      await offlineWrites.saveCow({ ...cow, name: nextName })
      setIsEditingName(false)
      showToast('Nome atualizado')
    } catch (e) {
      console.error('Falha ao salvar nome da vaca', e)
      showToast('Nao foi possivel salvar. Tente novamente.', 'error')
    } finally {
      setSavingName(false)
    }
  }

  const handleDeleteCow = async () => {
    if (!cow) return
    setDeletingCow(true)
    try {
      await offlineWrites.deleteCow(cow.id)
      showToast('Vaca excluida')
      onClose()
    } catch (e) {
      console.error('Falha ao apagar vaca', e)
      showToast('Nao foi possivel apagar. Tente novamente.', 'error')
    } finally {
      setDeletingCow(false)
    }
  }

  const openPhotoViewer = (src: string, title: string, event?: CalvingEvent, type: 'cow' | 'event' = 'event') => {
    setPhotoViewer({ src, title, event, type })
  }

  const closePhotoViewer = () => {
    setPhotoViewer({ src: null, title: '', event: undefined, type: undefined })
  }

  const updateEventPhoto = async (event: CalvingEvent, nextPhoto: string | null) => {
    try {
      await offlineWrites.saveCalving({ ...event, photoDataUrl: nextPhoto })
    } catch (e) {
      console.error('Falha ao atualizar foto do parto', e)
      showToast('Nao foi possivel atualizar a foto.', 'error')
    }
  }

  const handleReplacePhotoFromViewer = async (file?: File | null) => {
    if (!file || !photoViewer.src) return
    const compressed = await preparePhotoFromFile(file)
    if (photoViewer.type === 'cow' && cow) {
      await offlineWrites.saveCow({ ...cow, photoDataUrl: compressed })
      setPhotoViewer((prev) => ({ ...prev, src: compressed }))
      showToast('Foto atualizada')
      return
    }
    if (photoViewer.event) {
      await updateEventPhoto(photoViewer.event, compressed)
      setPhotoViewer((prev) => ({ ...prev, src: compressed }))
      showToast('Foto atualizada')
    }
  }

  const handleRemovePhotoFromViewer = async () => {
    if ((photoViewer.type === 'cow' || !photoViewer.src) && cow?.photoDataUrl) {
      await offlineWrites.saveCow({ ...cow, photoDataUrl: null })
      if (photoViewer.type === 'cow') closePhotoViewer()
      showToast('Foto removida')
      return
    }
    if (!photoViewer.event?.photoDataUrl) return
    const confirmRemove = window.confirm('Remover a foto deste parto?')
    if (!confirmRemove) return
    await updateEventPhoto(photoViewer.event, null)
    closePhotoViewer()
    showToast('Foto removida')
  }

  const openDeleteFlow = () => {
    setDeleteInput('')
    setIsActionsOpen(false)
    setIsDeleteConfirmOpen(true)
  }

  const confirmDeleteCow = async () => {
    if (!cow || !canDelete) return
    await handleDeleteCow()
    setIsDeleteConfirmOpen(false)
  }

  const triggerCowPhotoPick = (mode: 'camera' | 'gallery') => {
    const ref = mode === 'camera' ? cowPhotoCameraInputRef : cowPhotoGalleryInputRef
    setIsCowPhotoPickerOpen(false)
    const input = ref.current
    if (input) {
      input.value = ''
      input.click()
    }
  }

  const handlePickCowPhoto = async (file?: File | null) => {
    if (!cow || !file) return
    try {
      const processed = await preparePhotoFromFile(file)
      await offlineWrites.saveCow({ ...cow, photoDataUrl: processed })
      showToast('Foto atualizada')
    } catch (e) {
      console.error('Falha ao trocar foto da vaca', e)
      showToast('Nao foi possivel trocar a foto.', 'error')
    }
  }

  const handleDeleteEvent = async (ev: CalvingEvent) => {
    const confirmed = window.confirm('Excluir este parto?')
    if (!confirmed) return
    setDeletingEventId(ev.id)
    try {
      await offlineWrites.deleteCalving(ev.id)
      showToast('Parto removido')
    } catch (e) {
      console.error('Falha ao excluir parto', e)
      showToast('Nao foi possivel excluir.', 'error')
    } finally {
      setDeletingEventId(null)
    }
  }

  const handleAddPhotoToEvent = async (event: CalvingEvent, photoDataUrl: string) => {
    try {
      const currentPhotos = getEventPhotos(event)
      const nextPhotos = [...currentPhotos, photoDataUrl]
      const nextEvent = { ...event, photos: nextPhotos, photoDataUrl: nextPhotos[0] ?? null }
      await offlineWrites.saveCalving(nextEvent)
      setGalleryEvent(nextEvent)
      showToast('Foto adicionada')
    } catch (e) {
      console.error('Falha ao adicionar foto do parto', e)
      showToast('Nao foi possivel adicionar a foto.', 'error')
    }
  }

  const handleRemovePhotoFromEvent = async (event: CalvingEvent, index: number) => {
    const photos = getEventPhotos(event)
    if (!photos.length) return
    const nextPhotos = photos.filter((_, idx) => idx !== index)
    const nextEvent = { ...event, photos: nextPhotos, photoDataUrl: nextPhotos[0] ?? null }
    try {
      await offlineWrites.saveCalving(nextEvent)
      setGalleryEvent(nextEvent)
      showToast('Foto removida')
    } catch (e) {
      console.error('Falha ao remover foto do parto', e)
      showToast('Nao foi possivel remover a foto.', 'error')
    }
  }

  const skeleton = (
    <div className='space-y-4 animate-pulse'>
      <div className='h-7 rounded-lg' style={{ background: 'var(--surface-2)' }} />
      <div className='h-14 rounded-2xl border' style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }} />
      <div className='h-28 rounded-2xl border' style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }} />
      <div className='h-12 rounded-full border' style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }} />
    </div>
  )

  const lastEvent = events[0] || null
  const breedLabel = cow?.breed || cow?.raca
  const statusLabel = cow?.status
  const handleAvatarClick = () => {
    if (!cow) return
    if (cow.photoDataUrl) {
      openPhotoViewer(cow.photoDataUrl, cow.name, undefined, 'cow')
    } else {
      setIsCowPhotoPickerOpen(true)
    }
  }

  return (
    <>
      {galleryEvent ? (
        <CalvingDetailsScreen
          event={galleryEvent}
          cowName={cow.name}
          onClose={() => setGalleryEvent(null)}
          onEdit={() => {
            const event = galleryEvent
            setGalleryEvent(null)
            onEditCalving(event)
          }}
          onOpenMenu={() => setActiveEventMenu(galleryEvent)}
          onAddPhoto={handleAddPhotoToEvent}
          onRemovePhoto={handleRemovePhotoFromEvent}
        />
      ) : (
      <section className='space-y-4 pb-6'>
        <div className='flex items-center justify-between gap-3 rounded-2xl border px-3 py-3' style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <button type='button' onClick={onClose} aria-label='Voltar ao rebanho' className='h-10 w-10 rounded-full border flex items-center justify-center shrink-0 transition hover:brightness-105' style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--primary)' }}>
            <ArrowLeft size={18} />
          </button>
          <div className='min-w-0 flex-1 text-center'>
            <div className='text-[10px] font-semibold uppercase tracking-[0.14em]' style={{ color: 'var(--muted)' }}>Rebanho</div>
            <div className='text-base font-bold truncate' style={{ color: 'var(--text)' }}>Perfil da vaca</div>
          </div>
          <button type='button' onClick={() => setIsActionsOpen(true)} aria-label='Ações da vaca' className='h-10 w-10 rounded-full border flex items-center justify-center shrink-0 transition hover:brightness-105' style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--primary)' }}>
            <MoreVertical size={18} />
          </button>
        </div>
        {!cow ? (
          skeleton
        ) : (
          <div className='space-y-5'>
            <CowIdentityStrip
              cow={cow}
              breed={breedLabel}
              status={statusLabel}
              isEditingName={isEditingName}
              nameDraft={nameDraft}
              onNameChange={setNameDraft}
              onSaveName={saveName}
              onCancelEdit={() => {
                setIsEditingName(false)
                setNameDraft(cow.name)
              }}
              canSaveName={Boolean(canSaveName)}
              savingName={savingName}
              onAvatarClick={handleAvatarClick}
            />

            <div className='grid grid-cols-2 gap-3'>
              <div className='rounded-2xl border p-4' style={{ background: 'var(--primary)', borderColor: 'var(--primary-2)', color: '#fff' }}>
                <div className='text-xs font-medium' style={{ color: 'rgba(255,255,255,0.72)' }}>Partos registrados</div>
                <div className='mt-2 text-2xl font-bold'>{events.length}</div>
                <div className='mt-1 text-[11px]' style={{ color: 'rgba(255,255,255,0.72)' }}>
                  {events.filter((event) => event.sex === 'FEMEA').length} fêmeas · {events.filter((event) => event.sex === 'MACHO').length} machos
                </div>
              </div>
              <div className='rounded-2xl border p-4' style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                <div className='text-xs font-medium' style={{ color: 'var(--muted)' }}>Último parto</div>
                <div className='mt-2 text-base font-bold' style={{ color: 'var(--text)' }}>{lastEvent ? formatDateBR(lastEvent.date) : 'Sem registro'}</div>
                <div className='mt-1 text-[11px]' style={{ color: 'var(--muted)' }}>{lastEvent ? formatTimeSince(lastEvent.date) : 'Registre um parto para iniciar o histórico'}</div>
              </div>
            </div>

            <div className='space-y-2'>
              <div className='text-sm font-semibold' style={{ color: 'var(--text)' }}>
                Partos
              </div>

              {events.length === 0 ? (
                <div
                  className='rounded-xl border px-3 py-3 text-sm'
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--muted)' }}
                >
                  Nenhum parto registrado
                </div>
              ) : (
                <div
                  className='rounded-2xl border'
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {events.map((ev, index) => (
                    <BirthItemRow
                      key={ev.id}
                      event={ev}
                      isFirst={index === 0}
                      onOpen={() => setGalleryEvent(ev)}
                      onOpenMenu={() => setActiveEventMenu(ev)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className='pt-2'>
              <button
                type='button'
                onClick={onNewCalving}
                className='w-full h-12 rounded-full border text-sm font-semibold inline-flex items-center justify-center gap-2 transition hover:brightness-105'
                style={{
                  background: 'rgba(149, 193, 31, 0.12)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
              >
                <Plus size={16} />
                Novo parto
              </button>
            </div>
          </div>
        )}
      </section>
      )}

      <ActionSheet open={isActionsOpen} onClose={() => setIsActionsOpen(false)}>
        <div className='flex flex-col gap-1'>
          <button
            type='button'
            onClick={() => {
              setIsActionsOpen(false)
              setIsEditingName(true)
            }}
            className='w-full text-left px-3 py-3 rounded-xl transition hover:brightness-110'
            style={{ color: 'var(--text)' }}
          >
            Editar nome
          </button>
          <button
            type='button'
            onClick={() => {
              setIsActionsOpen(false)
              setIsCowPhotoPickerOpen(true)
            }}
            className='w-full text-left px-3 py-3 rounded-xl transition hover:brightness-110'
            style={{ color: 'var(--text)' }}
          >
            Trocar foto da vaca
          </button>
          <button
            type='button'
            onClick={openDeleteFlow}
            className='w-full text-left px-3 py-3 rounded-xl transition hover:brightness-110'
            style={{ color: 'var(--danger)' }}
          >
            Excluir vaca...
          </button>
        </div>
      </ActionSheet>

      <ActionSheet open={Boolean(activeEventMenu)} onClose={() => setActiveEventMenu(null)}>
        <div className='flex flex-col gap-1'>
          <button
            type='button'
            onClick={() => {
              if (activeEventMenu) onEditCalving(activeEventMenu)
              setActiveEventMenu(null)
            }}
            className='w-full text-left px-3 py-3 rounded-xl transition hover:brightness-110'
            style={{ color: 'var(--text)' }}
          >
            Editar parto
          </button>
          <button
            type='button'
            onClick={() => {
              if (activeEventMenu) handleDeleteEvent(activeEventMenu)
              setActiveEventMenu(null)
            }}
            className='w-full text-left px-3 py-3 rounded-xl transition hover:brightness-110 disabled:opacity-60'
            disabled={Boolean(deletingEventId)}
            style={{ color: 'var(--danger)' }}
          >
            {deletingEventId ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </ActionSheet>

      <Modal
        open={isDeleteConfirmOpen}
        title={cow ? `Excluir ${cow.name}?` : 'Excluir vaca?'}
        onClose={() => setIsDeleteConfirmOpen(false)}
        closeLabel={<X size={14} />}
        closeAriaLabel='Fechar'
        closeOnBackdrop
      >
        <div className='space-y-3'>
          <div className='text-sm' style={{ color: 'var(--muted)' }}>
            Digite <b>{(cow?.name || '').toUpperCase()}</b> para confirmar a exclusao. Essa acao remove a vaca e todo o historico.
          </div>
          <div className='space-y-2'>
            <div className='text-xs font-semibold' style={{ color: 'var(--muted)' }}>
              Confirmar nome
            </div>
            <input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              autoFocus
              className='w-full h-11 rounded-xl border px-3 outline-none'
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
              placeholder={cow?.name || 'Nome da vaca'}
            />
          </div>
          <div className='flex justify-end gap-2 pt-1'>
            <button
              type='button'
              onClick={() => setIsDeleteConfirmOpen(false)}
              className='h-10 px-4 rounded-xl text-sm font-semibold border transition hover:brightness-110'
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
            >
              Cancelar
            </button>
            <button
              type='button'
              onClick={confirmDeleteCow}
              disabled={!canDelete || deletingCow}
              className='h-10 px-4 rounded-xl text-sm font-semibold border transition hover:brightness-110 disabled:opacity-60'
              style={{
                background: 'rgba(255, 90, 106, 0.16)',
                borderColor: 'var(--border)',
                color: 'var(--danger)'
              }}
            >
              {deletingCow ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </div>
      </Modal>

      <ActionSheet open={isCowPhotoPickerOpen} onClose={() => setIsCowPhotoPickerOpen(false)}>
        <div className='flex flex-col gap-1'>
          <button
            type='button'
            onClick={() => triggerCowPhotoPick('camera')}
            className='w-full text-left px-3 py-3 rounded-xl transition hover:brightness-110 flex items-center gap-2'
            style={{ color: 'var(--text)' }}
          >
            <Camera size={16} />
            Tirar foto
          </button>
          <button
            type='button'
            onClick={() => triggerCowPhotoPick('gallery')}
            className='w-full text-left px-3 py-3 rounded-xl transition hover:brightness-110 flex items-center gap-2'
            style={{ color: 'var(--text)' }}
          >
            <Image size={16} />
            Escolher da galeria
          </button>
          {cow?.photoDataUrl ? (
            <button
              type='button'
              onClick={() => {
                setIsCowPhotoPickerOpen(false)
                handleRemovePhotoFromViewer()
              }}
              className='w-full text-left px-3 py-3 rounded-xl transition hover:brightness-110'
              style={{ color: 'var(--danger)' }}
            >
              Remover foto
            </button>
          ) : null}
          <button
            type='button'
            onClick={() => setIsCowPhotoPickerOpen(false)}
            className='w-full text-left px-3 py-3 rounded-xl transition hover:brightness-110'
            style={{ color: 'var(--muted)' }}
          >
            Cancelar
          </button>
        </div>
      </ActionSheet>

      <ImageViewerModal
        open={Boolean(photoViewer.src)}
        src={photoViewer.src}
        title={photoViewer.title}
        onClose={closePhotoViewer}
        onReplace={photoViewer.src ? handleReplacePhotoFromViewer : undefined}
        onRemove={photoViewer.src ? handleRemovePhotoFromViewer : undefined}
        canRemove={Boolean(photoViewer.type === 'cow' ? cow?.photoDataUrl : photoViewer.event?.photoDataUrl)}
      />

      {toast ? (
        <div
          className='fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full border text-sm font-semibold shadow-lg'
          style={{
            background: toast.tone === 'error' ? 'rgba(255, 90, 106, 0.16)' : 'var(--surface)',
            borderColor: 'var(--border)',
            color: toast.tone === 'error' ? 'var(--danger)' : 'var(--text)'
          }}
        >
          {toast.message}
        </div>
      ) : null}

      <input
        ref={cowPhotoCameraInputRef}
        type='file'
        accept='image/*'
        capture='environment'
        className='hidden'
        onChange={(e) => handlePickCowPhoto(e.target.files?.[0])}
      />
      <input
        ref={cowPhotoGalleryInputRef}
        type='file'
        accept='image/*'
        className='hidden'
        onChange={(e) => handlePickCowPhoto(e.target.files?.[0])}
      />
    </>
  )
}

function CalvingDetailsScreen({
  event,
  cowName,
  onClose,
  onEdit,
  onOpenMenu,
  onAddPhoto,
  onRemovePhoto
}: {
  event: CalvingEvent
  cowName: string
  onClose: () => void
  onEdit: () => void
  onOpenMenu: () => void
  onAddPhoto: (event: CalvingEvent, photoDataUrl: string) => Promise<void>
  onRemovePhoto: (event: CalvingEvent, photoIndex: number) => Promise<void>
}) {
  const photos = getEventPhotos(event)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const carouselRef = React.useRef<HTMLDivElement>(null)
  const cameraInputRef = React.useRef<HTMLInputElement>(null)
  const galleryInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setActiveIndex(0)
    carouselRef.current?.scrollTo({ left: 0 })
  }, [event.id])

  React.useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(photos.length - 1, 0)))
  }, [photos.length])

  const handleCarouselScroll = () => {
    const element = carouselRef.current
    if (!element || !element.clientWidth) return
    const nextIndex = Math.round(element.scrollLeft / element.clientWidth)
    setActiveIndex(Math.max(0, Math.min(nextIndex, photos.length - 1)))
  }

  const goToPhoto = (index: number) => {
    const element = carouselRef.current
    if (!element) return
    const safeIndex = Math.max(0, Math.min(index, photos.length - 1))
    element.scrollTo({ left: element.clientWidth * safeIndex, behavior: 'smooth' })
    setActiveIndex(safeIndex)
  }

  const triggerPick = (mode: 'camera' | 'gallery') => {
    const targetRef = mode === 'camera' ? cameraInputRef : galleryInputRef
    setIsPickerOpen(false)
    const input = targetRef.current
    if (input) {
      input.value = ''
      input.click()
    }
  }

  const handlePickPhoto = async (file?: File | null) => {
    if (!file) return
    try {
      const processed = await preparePhotoFromFile(file)
      await onAddPhoto(event, processed)
      const nextIndex = photos.length
      setActiveIndex(nextIndex)
      window.requestAnimationFrame(() => {
        const carousel = carouselRef.current
        if (carousel) carousel.scrollTo({ left: carousel.clientWidth * nextIndex, behavior: 'smooth' })
      })
    } catch (error) {
      console.error('Falha ao adicionar foto do parto', error)
      alert('Não foi possível adicionar a foto. Tente novamente.')
    }
  }

  const handleRemove = async () => {
    if (!photos.length || isRemoving) return
    if (!window.confirm('Remover esta foto do parto?')) return
    setIsRemoving(true)
    try {
      await onRemovePhoto(event, activeIndex)
    } catch (error) {
      console.error('Falha ao remover foto do parto', error)
      alert('Não foi possível remover a foto.')
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <>
      <section className='space-y-4 pb-6'>
        <div className='flex items-center justify-between gap-3 rounded-2xl border px-3 py-3' style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <button type='button' onClick={onClose} aria-label='Voltar ao perfil da vaca' className='h-10 w-10 rounded-full border flex items-center justify-center shrink-0 transition hover:brightness-105' style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--primary)' }}>
            <ArrowLeft size={18} />
          </button>
          <div className='min-w-0 flex-1 text-center'>
            <div className='text-[10px] font-semibold uppercase tracking-[0.14em]' style={{ color: 'var(--muted)' }}>{cowName}</div>
            <div className='text-base font-bold truncate' style={{ color: 'var(--text)' }}>Detalhe do parto</div>
          </div>
          <button type='button' onClick={onOpenMenu} aria-label='Ações do parto' className='h-10 w-10 rounded-full border flex items-center justify-center shrink-0 transition hover:brightness-105' style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--primary)' }}>
            <MoreVertical size={18} />
          </button>
        </div>

        {photos.length ? (
          <div className='relative overflow-hidden rounded-[28px] border' style={{ background: 'var(--primary)', borderColor: 'var(--border)', boxShadow: '0 18px 42px -30px var(--shadow)' }}>
            <div
              ref={carouselRef}
              onScroll={handleCarouselScroll}
              className='no-scrollbar flex overflow-x-auto snap-x snap-mandatory'
              style={{ touchAction: 'pan-x' }}
              role='region'
              tabIndex={0}
              aria-label='Fotos do parto; deslize para navegar'
            >
              {photos.map((photo, index) => (
                <img
                  key={index}
                  src={photo}
                  alt={`Foto ${index + 1} do parto de ${cowName}`}
                  className='h-[min(60dvh,560px)] min-h-[280px] w-full shrink-0 snap-center object-cover'
                />
              ))}
            </div>
            <div className='absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm' style={{ background: 'rgba(11,48,36,0.78)', color: '#fff' }}>
              {activeIndex + 1} / {photos.length}
            </div>
            {photos.length > 1 ? (
              <>
                <button type='button' onClick={() => goToPhoto(activeIndex - 1)} disabled={activeIndex === 0} aria-label='Foto anterior' className='absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full flex items-center justify-center transition hover:brightness-110 disabled:opacity-40' style={{ background: 'rgba(11,48,36,0.82)', color: '#fff' }}>
                  <ChevronLeft size={21} />
                </button>
                <button type='button' onClick={() => goToPhoto(activeIndex + 1)} disabled={activeIndex >= photos.length - 1} aria-label='Próxima foto' className='absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full flex items-center justify-center transition hover:brightness-110 disabled:opacity-40' style={{ background: 'rgba(11,48,36,0.82)', color: '#fff' }}>
                  <ChevronRight size={21} />
                </button>
                <div className='absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5'>
                  {photos.map((_, index) => (
                    <button key={index} type='button' onClick={() => goToPhoto(index)} aria-label={`Ver foto ${index + 1}`} aria-pressed={index === activeIndex} className='h-2 rounded-full transition-all' style={{ width: index === activeIndex ? 20 : 7, background: index === activeIndex ? 'var(--accent)' : 'rgba(255,255,255,0.8)' }} />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <div className='rounded-[28px] border px-5 py-9 flex flex-col items-center text-center gap-3' style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
            <div className='h-14 w-14 rounded-2xl flex items-center justify-center' style={{ background: 'var(--accent-soft)', color: 'var(--primary)' }}>
              <Camera size={24} />
            </div>
            <div>
              <div className='font-semibold' style={{ color: 'var(--text)' }}>Ainda não há foto deste parto</div>
              <p className='mt-1 text-sm' style={{ color: 'var(--muted)' }}>Adicione uma imagem para guardar junto com o registro.</p>
            </div>
            <button type='button' onClick={() => setIsPickerOpen(true)} className='h-10 px-4 rounded-full text-sm font-semibold inline-flex items-center gap-2' style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
              <Camera size={16} />
              Adicionar foto
            </button>
          </div>
        )}

        <div className='rounded-[24px] border p-4 sm:p-5' style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: '0 14px 38px -32px var(--shadow)' }}>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <div className='text-[10px] font-semibold uppercase tracking-[0.14em]' style={{ color: 'var(--muted)' }}>Registro de nascimento</div>
              <h2 className='mt-1 text-xl font-bold' style={{ color: 'var(--text)' }}>{formatDateBR(event.date)}</h2>
              <p className='mt-1 text-sm' style={{ color: 'var(--muted)' }}>{formatTimeSince(event.date)}</p>
            </div>
            <span className='px-3 py-1.5 rounded-full text-xs font-semibold' style={{ background: event.sex === 'FEMEA' ? 'var(--accent-soft)' : 'color-mix(in srgb, var(--tertiary) 10%, white)', color: 'var(--tertiary)' }}>
              Bezerro · {sexLabel(event.sex)}
            </span>
          </div>
          <div className='mt-4 grid grid-cols-2 gap-3'>
            <div className='rounded-2xl p-3' style={{ background: 'var(--surface-2)' }}>
              <div className='text-[10px] font-semibold uppercase tracking-wide' style={{ color: 'var(--muted)' }}>Mãe</div>
              <div className='mt-1 text-sm font-semibold truncate' style={{ color: 'var(--text)' }}>{cowName}</div>
            </div>
            <div className='rounded-2xl p-3' style={{ background: 'var(--surface-2)' }}>
              <div className='text-[10px] font-semibold uppercase tracking-wide' style={{ color: 'var(--muted)' }}>Fotos</div>
              <div className='mt-1 text-sm font-semibold' style={{ color: 'var(--text)' }}>{photos.length} {photos.length === 1 ? 'imagem' : 'imagens'}</div>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-2'>
          <button type='button' onClick={onEdit} className='h-11 rounded-full border text-sm font-semibold transition hover:brightness-105' style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--primary)' }}>
            Editar registro
          </button>
          <button type='button' onClick={() => setIsPickerOpen(true)} className='h-11 rounded-full text-sm font-semibold transition hover:brightness-105' style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
            <span className='inline-flex items-center justify-center gap-2'><Image size={16} /> Adicionar foto</span>
          </button>
        </div>
        {photos.length ? (
          <button type='button' onClick={handleRemove} disabled={isRemoving} className='w-full h-10 rounded-full text-xs font-semibold transition disabled:opacity-60' style={{ color: 'var(--danger)' }}>
            {isRemoving ? 'Removendo foto...' : `Remover foto ${activeIndex + 1}`}
          </button>
        ) : null}
      </section>

      <ActionSheet open={isPickerOpen} onClose={() => setIsPickerOpen(false)}>
        <div className='flex flex-col gap-1'>
          <button type='button' onClick={() => triggerPick('camera')} className='w-full text-left px-3 py-3 rounded-xl transition hover:brightness-110 flex items-center gap-2' style={{ color: 'var(--text)' }}>
            <Camera size={16} />
            Tirar foto
          </button>
          <button type='button' onClick={() => triggerPick('gallery')} className='w-full text-left px-3 py-3 rounded-xl transition hover:brightness-110 flex items-center gap-2' style={{ color: 'var(--text)' }}>
            <Image size={16} />
            Escolher da galeria
          </button>
          <button type='button' onClick={() => setIsPickerOpen(false)} className='w-full text-left px-3 py-3 rounded-xl transition hover:brightness-110' style={{ color: 'var(--muted)' }}>
            Cancelar
          </button>
        </div>
      </ActionSheet>

      <input ref={cameraInputRef} type='file' accept='image/*' capture='environment' className='hidden' onChange={(event) => handlePickPhoto(event.target.files?.[0])} />
      <input ref={galleryInputRef} type='file' accept='image/*' className='hidden' onChange={(event) => handlePickPhoto(event.target.files?.[0])} />
    </>
  )
}

function ActionSheet({
  open,
  onClose,
  children
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div
      className='fixed inset-0 z-50 flex items-end justify-center px-4 pb-6'
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className='w-full max-w-lg rounded-2xl border p-2'
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

function ImageViewerModal({
  open,
  src,
  title,
  onClose,
  onReplace,
  onRemove,
  canRemove = true
}: {
  open: boolean
  src: string | null
  title: string
  onClose: () => void
  onReplace?: (file?: File | null) => void
  onRemove?: () => void
  canRemove?: boolean
}) {
  const [isReplacePickerOpen, setIsReplacePickerOpen] = useState(false)
  const replaceCameraInputRef = React.useRef<HTMLInputElement>(null)
  const replaceGalleryInputRef = React.useRef<HTMLInputElement>(null)
  const [zoom, setZoom] = useState(1)
  const viewportRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) setIsReplacePickerOpen(false)
  }, [open])

  React.useEffect(() => {
    if (open) setZoom(1)
  }, [open, src])

  const triggerReplacePick = (mode: 'camera' | 'gallery') => {
    if (!onReplace) return
    const targetRef = mode === 'camera' ? replaceCameraInputRef : replaceGalleryInputRef
    setIsReplacePickerOpen(false)
    const input = targetRef.current
    if (input) {
      input.value = ''
      input.click()
    }
  }

  const adjustZoom = (delta: number) => {
    setZoom((current) => {
      const next = Math.min(3, Math.max(1, Number((current + delta).toFixed(2))))
      return next
    })
  }

  if (!open || !src) return null
  return (
    <>
      <div
        className='fixed inset-0 z-50 flex flex-col p-0'
        style={{ background: 'rgba(12, 27, 18, 0.96)' }}
        onClick={onClose}
      >
        <div className='flex flex-col h-full w-full max-w-5xl mx-auto' onClick={(e) => e.stopPropagation()}>
          <div className='flex items-center justify-between gap-2 px-3 pb-3 pt-[max(12px,env(safe-area-inset-top,0px))] shrink-0'>
            <div className='text-sm font-semibold' style={{ color: 'var(--text)' }}>
              {title}
            </div>
            <div className='flex items-center gap-2 flex-wrap justify-end'>
              <div
                className='inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold'
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <button
                  type='button'
                  onClick={() => adjustZoom(-0.2)}
                  className='h-7 w-7 rounded-full border flex items-center justify-center'
                  style={{ borderColor: 'var(--border)' }}
                  aria-label='Diminuir zoom'
                >
                  -
                </button>
                <span>{`${Math.round(zoom * 100)}%`}</span>
                <button
                  type='button'
                  onClick={() => adjustZoom(0.2)}
                  className='h-7 w-7 rounded-full border flex items-center justify-center'
                  style={{ borderColor: 'var(--border)' }}
                  aria-label='Aumentar zoom'
                >
                  +
                </button>
                <button
                  type='button'
                  onClick={() => setZoom(1)}
                  className='h-7 px-3 rounded-full border'
                  style={{ borderColor: 'var(--border)' }}
                >
                  Reset
                </button>
              </div>
              {onReplace && (
                <button
                  type='button'
                  onClick={() => setIsReplacePickerOpen(true)}
                  className='h-10 px-3 rounded-xl text-sm font-semibold border inline-flex items-center gap-2 transition hover:brightness-110'
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                >
                  Trocar
                </button>
              )}
              {onRemove && canRemove && (
                <button
                  type='button'
                  onClick={onRemove}
                  className='h-10 px-3 rounded-xl text-sm font-semibold border transition hover:brightness-110'
                  style={{
                    background: 'rgba(255, 90, 106, 0.16)',
                    borderColor: 'var(--border)',
                    color: 'var(--danger)'
                  }}
                >
                  Remover
                </button>
              )}
              <button
                type='button'
                onClick={onClose}
                className='h-10 w-10 rounded-full border flex items-center justify-center transition hover:brightness-110'
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                aria-label='Fechar visualizacao'
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div
            ref={viewportRef}
            className='flex-1 min-h-0 overflow-hidden'
            style={{ borderColor: 'transparent' }}
            onWheel={(e) => {
              if (!e.ctrlKey) return
              e.preventDefault()
              adjustZoom(e.deltaY > 0 ? -0.1 : 0.1)
            }}
          >
            <div className='min-h-full min-w-full flex items-center justify-center p-0'>
              <img
                src={src}
                alt={title}
                className='h-full w-full object-contain rounded-none'
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', maxWidth: '100%', maxHeight: '100%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {onReplace ? (
        <>
          <ActionSheet open={isReplacePickerOpen} onClose={() => setIsReplacePickerOpen(false)}>
            <div className='flex flex-col gap-1'>
              <button
                type='button'
                onClick={() => triggerReplacePick('camera')}
                className='w-full text-left px-3 py-3 rounded-xl transition hover:brightness-110 flex items-center gap-2'
                style={{ color: 'var(--text)' }}
              >
                <Camera size={16} />
                Tirar foto
              </button>
              <button
                type='button'
                onClick={() => triggerReplacePick('gallery')}
                className='w-full text-left px-3 py-3 rounded-xl transition hover:brightness-110 flex items-center gap-2'
                style={{ color: 'var(--text)' }}
              >
                <Image size={16} />
                Escolher da galeria
              </button>
              <button
                type='button'
                onClick={() => setIsReplacePickerOpen(false)}
                className='w-full text-left px-3 py-3 rounded-xl transition hover:brightness-110'
                style={{ color: 'var(--muted)' }}
              >
                Cancelar
              </button>
            </div>
          </ActionSheet>

          <input
            ref={replaceCameraInputRef}
            type='file'
            accept='image/*'
            capture='environment'
            className='hidden'
            onChange={(e) => onReplace?.(e.target.files?.[0])}
          />
          <input
            ref={replaceGalleryInputRef}
            type='file'
            accept='image/*'
            className='hidden'
            onChange={(e) => onReplace?.(e.target.files?.[0])}
          />
        </>
      ) : null}
    </>
  )
}

function CalvingModal({
  open,
  cows,
  initialCowId,
  editing,
  onClose,
  onSaved
}: {
  open: boolean
  cows: Cow[]
  initialCowId: string | null
  editing: CalvingEvent | null
  onClose: () => void
  onSaved: () => void
}) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [selectedCowId, setSelectedCowId] = useState<string>('')
  const [newCowName, setNewCowName] = useState<string>('')
  const [date, setDate] = useState<string>('')
  const [sex, setSex] = useState<CalvingSex>('FEMEA')
  const [photos, setPhotos] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false)
  const cameraInputRef = React.useRef<HTMLInputElement>(null)
  const galleryInputRef = React.useRef<HTMLInputElement>(null)

  const formatInputDate = (value: Date) => {
    const yyyy = value.getFullYear()
    const mm = String(value.getMonth() + 1).padStart(2, '0')
    const dd = String(value.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const setQuickDate = (offsetDays: number) => {
    const base = new Date()
    base.setHours(12, 0, 0, 0)
    base.setDate(base.getDate() - offsetDays)
    setDate(formatInputDate(base))
  }

  const todayValue = formatInputDate(new Date())
  const yesterdayRef = new Date()
  yesterdayRef.setDate(yesterdayRef.getDate() - 1)
  const yesterdayValue = formatInputDate(yesterdayRef)

  React.useEffect(() => {
    if (!open) {
      setIsPhotoPickerOpen(false)
      return
    }

    // Reset
    if (editing) {
      setMode('existing')
      setSelectedCowId(editing.cowId)
      setNewCowName('')
      setSex(editing.sex)
      setPhotos(getEventPhotos(editing))
      const d = new Date(editing.date)
      setDate(!Number.isNaN(d.getTime()) ? formatInputDate(d) : '')
      return
    }

    const today = new Date()
    setDate(formatInputDate(today))
    setSex('FEMEA')
    setPhotos([])
    setNewCowName('')
    setMode('existing')

    if (initialCowId) {
      setSelectedCowId(initialCowId)
    } else {
      setSelectedCowId(cows[0]?.id || '')
    }
  }, [open, editing?.id, initialCowId, cows])

  const isTodaySelected = date === todayValue
  const isYesterdaySelected = date === yesterdayValue

  const title = editing ? 'Editar parto' : 'Cadastrar novo parto'
  const primaryPhoto = photos[0]

  const handlePickPhoto = async (file?: File | null) => {
    if (!file) return
    try {
      const processed = await preparePhotoFromFile(file)
      setPhotos((prev) => {
        if (!prev.length) return [processed]
        const [, ...rest] = prev
        return [processed, ...rest]
      })
    } catch (e) {
      console.error('Falha ao preparar imagem', e)
      const reason = e instanceof Error && e.message ? ` Detalhe: ${e.message}` : ''
      alert(`Nao foi possivel carregar a imagem. Tente outra foto ou tire uma foto agora.${reason}`)
    }
  }

  const triggerPhotoPick = (mode: 'camera' | 'gallery') => {
    const targetRef = mode === 'camera' ? cameraInputRef : galleryInputRef
    setIsPhotoPickerOpen(false)
    const input = targetRef.current
    if (input) {
      input.value = ''
      input.click()
    }
  }

  const canSave = (() => {
    if (!date) return false
    if (mode === 'new') return !!newCowName.trim()
    return !!selectedCowId
  })()

  const save = async () => {
    if (!canSave) return
    setSaving(true)

    try {
      let cowId = selectedCowId

      if (mode === 'new') {
        const name = newCowName.trim()
        cowId = crypto.randomUUID()
        await offlineWrites.saveCow({ id: cowId, name })
      }

      const evId = editing?.id || crypto.randomUUID()
      const photoList = photos.filter(Boolean)
      const ev: CalvingEvent = {
        ...(editing || {}),
        id: evId,
        cowId,
        date: toDateTime(date),
        sex,
        photos: photoList,
        photoDataUrl: photoList[0] ?? null
      }
      await offlineWrites.saveCalving(ev)
      onSaved()
    } catch (e) {
      console.error('Falha ao salvar parto', e)
      showToast('Nao foi possivel salvar. Tente novamente.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const primaryLabel = editing ? 'Salvar alteracoes' : 'Registrar parto'

  return (
    <>
      <Modal
        open={open}
        title={title}
        onClose={onClose}
        closeOnBackdrop
        closeLabel={<X size={14} />}
        closeAriaLabel='Fechar'
      >
        <div
          className='space-y-4 overflow-y-auto'
          style={{
            maxHeight: 'calc(100vh - 120px)',
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))'
          }}
        >
          <div
            className='rounded-2xl border p-4 space-y-3'
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              boxShadow: '0 18px 40px -32px var(--shadow)'
            }}
          >
            <div className='flex items-center justify-between gap-2'>
              <div
                className='text-[11px] font-semibold uppercase tracking-wide'
                style={{ color: 'var(--muted)', letterSpacing: '0.06em' }}
              >
                Vaca (obrigatorio)
              </div>
              {!editing && (
                <button
                  type='button'
                  onClick={() => {
                    if (mode === 'existing') {
                      setMode('new')
                      setNewCowName('')
                      setSelectedCowId('')
                    } else {
                      setMode('existing')
                    }
                  }}
                  className='h-9 px-3 rounded-full text-xs font-semibold border inline-flex items-center gap-2 transition hover:brightness-110'
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                >
                  {mode === 'new' ? (
                    'Selecionar vaca'
                  ) : (
                    <>
                      <Plus size={14} />
                      Nova vaca
                    </>
                  )}
                </button>
              )}
            </div>

            {!editing ? (
              mode === 'existing' ? (
                <div className='relative'>
                  <Search
                    size={16}
                    className='absolute left-3 top-1/2 -translate-y-1/2'
                    style={{ color: 'var(--muted)' }}
                  />
                  <select
                    value={selectedCowId}
                    onChange={(e) => setSelectedCowId(e.target.value)}
                    className='w-full h-11 rounded-xl border pl-9 pr-3 outline-none appearance-none'
                    style={{
                      background: 'var(--surface-2)',
                      borderColor: 'var(--border)',
                      color: 'var(--text)'
                    }}
                  >
                    {cows.map((cow) => (
                      <option key={cow.id} value={cow.id}>
                        {cow.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className='relative'>
                  <Search
                    size={16}
                    className='absolute left-3 top-1/2 -translate-y-1/2'
                    style={{ color: 'var(--muted)' }}
                  />
                  <input
                    value={newCowName}
                    onChange={(e) => setNewCowName(e.target.value)}
                    placeholder='Nome da vaca...'
                    className='w-full h-11 rounded-xl border pl-9 pr-3 outline-none'
                    style={{
                      background: 'var(--surface-2)',
                      borderColor: 'var(--border)',
                      color: 'var(--text)'
                    }}
                  />
                </div>
              )
            ) : (
              <div
                className='rounded-xl border px-3 py-2 text-sm'
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--muted)' }}
              >
                Vaca do registro:{' '}
                <b style={{ color: 'var(--text)' }}>{cows.find((c) => c.id === editing.cowId)?.name || 'Vaca'}</b>
              </div>
            )}
          </div>

          <div
            className='rounded-2xl border p-4 space-y-4'
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              boxShadow: '0 18px 40px -32px var(--shadow)'
            }}
          >
            <div
              className='text-[11px] font-semibold uppercase tracking-wide'
              style={{ color: 'var(--muted)', letterSpacing: '0.06em' }}
            >
              Informacoes do parto
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between gap-3 flex-wrap'>
                <div
                  className='text-[11px] font-semibold uppercase tracking-wide'
                  style={{ color: 'var(--muted)', letterSpacing: '0.06em' }}
                >
                  Data do parto (obrigatorio)
                </div>
                <div className='flex items-center gap-2'>
                  <button
                    type='button'
                    onClick={() => setQuickDate(0)}
                    className='h-9 px-4 rounded-full text-xs font-semibold border transition'
                    style={{
                      background: isTodaySelected ? 'var(--accent)' : 'var(--surface)',
                      borderColor: isTodaySelected ? 'var(--accent)' : 'var(--border)',
                      color: isTodaySelected ? 'var(--accent-ink)' : 'var(--text)',
                      boxShadow: isTodaySelected ? '0 12px 32px -22px var(--shadow)' : 'none'
                    }}
                  >
                    Hoje
                  </button>
                  <button
                    type='button'
                    onClick={() => setQuickDate(1)}
                    className='h-9 px-4 rounded-full text-xs font-semibold border transition'
                    style={{
                      background: isYesterdaySelected ? 'var(--accent)' : 'var(--surface)',
                      borderColor: isYesterdaySelected ? 'var(--accent)' : 'var(--border)',
                      color: isYesterdaySelected ? 'var(--accent-ink)' : 'var(--text)',
                      boxShadow: isYesterdaySelected ? '0 12px 32px -22px var(--shadow)' : 'none'
                    }}
                  >
                    Ontem
                  </button>
                </div>
              </div>
              <div className='relative'>
                <CalendarDays
                  size={16}
                  className='absolute left-3 top-1/2 -translate-y-1/2'
                  style={{ color: 'var(--muted)' }}
                />
                <input
                  type='date'
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className='w-full h-12 rounded-xl border pl-10 pr-3 outline-none text-sm'
                  style={{
                    background: 'var(--surface-2)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <div
                className='text-[11px] font-semibold uppercase tracking-wide'
                style={{ color: 'var(--muted)', letterSpacing: '0.06em' }}
              >
                Sexo
              </div>
              <div className='grid grid-cols-2 gap-2'>
                <button
                  type='button'
                  onClick={() => setSex('MACHO')}
                  className='h-12 rounded-full border px-4 text-sm font-semibold flex items-center justify-center gap-2 transition'
                  style={{
                    background: sex === 'MACHO' ? 'color-mix(in srgb, var(--accent) 42%, white)' : 'var(--surface-2)',
                    borderColor: sex === 'MACHO' ? 'var(--accent)' : 'var(--border)',
                    color: sex === 'MACHO' ? 'var(--text)' : 'var(--muted)',
                    boxShadow: sex === 'MACHO' ? '0 12px 32px -22px var(--shadow)' : 'none'
                  }}
                >
                  <CircleDot size={16} />
                  Macho
                </button>
                <button
                  type='button'
                  onClick={() => setSex('FEMEA')}
                  className='h-12 rounded-full border px-4 text-sm font-semibold flex items-center justify-center gap-2 transition'
                  style={{
                    background: sex === 'FEMEA' ? 'color-mix(in srgb, var(--accent) 42%, white)' : 'var(--surface-2)',
                    borderColor: sex === 'FEMEA' ? 'var(--accent)' : 'var(--border)',
                    color: sex === 'FEMEA' ? 'var(--text)' : 'var(--muted)',
                    boxShadow: sex === 'FEMEA' ? '0 12px 32px -22px var(--shadow)' : 'none'
                  }}
                >
                  <Circle size={16} />
                  Femea
                </button>
              </div>
            </div>
          </div>

          <div
            className='rounded-2xl border p-4 space-y-3'
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              boxShadow: '0 18px 40px -32px var(--shadow)'
            }}
          >
            <div
              className='text-[11px] font-semibold uppercase tracking-wide'
              style={{ color: 'var(--muted)', letterSpacing: '0.06em' }}
            >
              Foto
            </div>

            {primaryPhoto ? (
              <div
                className='rounded-xl border overflow-hidden relative'
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
              >
                {photos.length > 1 ? (
                  <div
                    className='absolute top-3 left-3 text-[11px] font-semibold px-2 py-1 rounded-full border'
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    {`1/${photos.length}`}
                  </div>
                ) : null}
                <img src={primaryPhoto} alt='Preview da foto' className='w-full h-48 object-cover' />
                <div className='absolute inset-x-3 bottom-3 flex justify-end gap-2'>
                  <button
                    type='button'
                    onClick={() => setIsPhotoPickerOpen(true)}
                    className='h-10 px-4 rounded-full text-sm font-semibold border inline-flex items-center gap-2 transition hover:brightness-110'
                    style={{
                      background: 'var(--surface)',
                      borderColor: 'var(--border)',
                      color: 'var(--text)'
                    }}
                  >
                    Trocar
                  </button>
                  <button
                    type='button'
                    onClick={() => setPhotos((prev) => prev.slice(1))}
                    className='h-10 px-4 rounded-full text-sm font-semibold border transition hover:brightness-110'
                    style={{
                      background: 'rgba(255, 90, 106, 0.16)',
                      borderColor: 'var(--border)',
                      color: 'var(--danger)'
                    }}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ) : (
              <button
                type='button'
                onClick={() => setIsPhotoPickerOpen(true)}
                className='h-12 px-4 rounded-xl border inline-flex items-center gap-2 transition hover:brightness-110 text-sm font-semibold'
                style={{
                  background: 'var(--surface-2)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
              >
                <Camera size={18} />
                Adicionar foto (opcional)
              </button>
            )}
          </div>

          <div className='space-y-2 pt-1'>
            <button
              type='button'
              onClick={save}
              disabled={!canSave || saving}
              className='w-full h-12 rounded-full text-sm font-semibold border transition disabled:opacity-60'
              style={{
                background: '#95c11f',
                borderColor: '#95c11f',
                color: '#0c120b',
                boxShadow: '0 16px 40px -26px var(--shadow)'
              }}
            >
              {saving ? 'Salvando...' : primaryLabel}
            </button>
            <button
              type='button'
              onClick={onClose}
              className='w-full h-11 rounded-full text-sm font-semibold border transition hover:brightness-110'
              style={{
                background: 'transparent',
                borderColor: 'var(--border)',
                color: 'var(--muted)'
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      <ActionSheet open={isPhotoPickerOpen} onClose={() => setIsPhotoPickerOpen(false)}>
        <div className='flex flex-col gap-1'>
          <button
            type='button'
            onClick={() => triggerPhotoPick('camera')}
            className='w-full text-left px-3 py-3 rounded-xl transition hover:brightness-110 flex items-center gap-2'
            style={{ color: 'var(--text)' }}
          >
            <Camera size={16} />
            Tirar foto
          </button>
          <button
            type='button'
            onClick={() => triggerPhotoPick('gallery')}
            className='w-full text-left px-3 py-3 rounded-xl transition hover:brightness-110 flex items-center gap-2'
            style={{ color: 'var(--text)' }}
          >
            <Image size={16} />
            Escolher da galeria
          </button>
          <button
            type='button'
            onClick={() => setIsPhotoPickerOpen(false)}
            className='w-full text-left px-3 py-3 rounded-xl transition hover:brightness-110'
            style={{ color: 'var(--muted)' }}
          >
            Cancelar
          </button>
        </div>
      </ActionSheet>

      <input
        ref={cameraInputRef}
        type='file'
        accept='image/*'
        capture='environment'
        className='hidden'
        onChange={(e) => handlePickPhoto(e.target.files?.[0])}
      />
      <input
        ref={galleryInputRef}
        type='file'
        accept='image/*'
        className='hidden'
        onChange={(e) => handlePickPhoto(e.target.files?.[0])}
      />
    </>
  )
}

function NewCowModal({
  open,
  onClose,
  onSaved
}: {
  open: boolean
  onClose: () => void
  onSaved: (cow: Cow) => void
}) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  React.useEffect(() => {
    if (open) setName('')
  }, [open])

  const canSave = Boolean(name.trim())

  const save = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) return
    setSaving(true)
    try {
      const newCow: Cow = { id: crypto.randomUUID(), name: trimmedName }
      await offlineWrites.saveCow(newCow)
      onSaved(newCow)
    } catch (e) {
      console.error('Falha ao salvar vaca', e)
      showToast('Nao foi possivel salvar. Tente novamente.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title='Nova vaca' onClose={onClose} closeOnBackdrop>
      <div className='space-y-4'>
        <div className='space-y-2'>
          <div className='text-xs font-semibold' style={{ color: 'var(--muted)' }}>
            Nome da vaca
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Nome da vaca...'
            className='w-full h-11 rounded-xl border px-3 outline-none'
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          />
        </div>

        <div className='flex gap-2 pt-2'>
          <button
            type='button'
            onClick={save}
            disabled={!canSave || saving}
            className='flex-1 h-11 rounded-xl text-sm font-semibold border transition disabled:opacity-60'
            style={{
              background: 'var(--accent, var(--primary, #b8ff2c))',
              borderColor: 'transparent',
              color: 'var(--accentText, #07110a)'
            }}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            type='button'
            onClick={onClose}
            className='h-11 px-4 rounded-xl text-sm font-semibold border transition hover:brightness-110'
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  )
}









