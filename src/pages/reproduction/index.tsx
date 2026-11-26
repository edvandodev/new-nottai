import React, { useMemo, useState } from 'react'
import {
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
import { StatCard } from '@/components/payments/StatCard'
import { offlineWrites } from '@/services/offlineWrites'
import { formatTimeSince } from '@/utils/time'
import '../../styles/theme-flat.css'

type ReproductionPageProps = {
  cows: Cow[]
  calvings: CalvingEvent[]
}

const cowCardColors = {
  accent: '#244b2d',
  background: 'rgba(36, 75, 45, 0.08)',
  border: 'rgba(36, 75, 45, 0.18)'
}

const birthsCardColors = {
  accent: '#4f8054',
  background: 'rgba(79, 128, 84, 0.10)',
  border: 'rgba(79, 128, 84, 0.20)'
}

const iconColor = '#708074'

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


function BirthItemRow({
  event,
  onOpen,
  onOpenMenu
}: {
  event: CalvingEvent
  onOpen: () => void
  onOpenMenu: () => void
}) {
  const photos = getEventPhotos(event)

  return (
    <li className='cow-birth'>
      <button type='button' className='cow-birth-open' onClick={onOpen}>
        <span className='cow-birth-thumb'>
          {photos[0]
            ? <img src={photos[0]} alt='' loading='lazy' />
            : <CalendarDays size={21} aria-hidden='true' />}
        </span>
        <span className='cow-birth-copy'>
          <strong>{formatDateBR(event.date)}</strong>
          <span>{sexLabel(event.sex)} · {formatTimeSince(event.date)}</span>
          <span className='cow-birth-photos'>
            <Image size={14} aria-hidden='true' />
            {photos.length === 1 ? '1 foto' : `${photos.length} fotos`}
          </span>
        </span>
        <ChevronRight size={18} className='cow-birth-chevron' aria-hidden='true' />
      </button>
      <button type='button' className='agro-icon-button' onClick={onOpenMenu} aria-label={`Ações do parto de ${formatDateBR(event.date)}`}>
        <MoreVertical size={18} />
      </button>
    </li>
  )
}

export function ReproductionPage({ cows, calvings }: ReproductionPageProps) {
  const [search, setSearch] = useState('')
  const [selectedCow, setSelectedCow] = useState<Cow | null>(null)
  const [isCowModalOpen, setIsCowModalOpen] = useState(false)
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
    setIsCowModalOpen(true)
  }

  const currentCow = cows.find((cow) => cow.id === selectedCow?.id) ?? selectedCow

  const cowEvents = useMemo(() => {
    if (!selectedCow) return []
    return calvingsByCow.get(selectedCow.id) || []
  }, [selectedCow, calvingsByCow])

  return (
    <div className='reproduction-page space-y-5'>
      <div
        className='flat-card p-4 sm:p-6'
      >
        <div className='flex items-center justify-between gap-3'>
          <div>
            <h1 className='agro-page-title'>Reprodução</h1>
            <p className='mt-1 text-sm text-[var(--muted)]'>Vacas e histórico de partos</p>
          </div>

          <button
            type='button'
            onClick={() => {
              setEditingCalving(null)
              setIsNewMenuOpen(true)
            }}
            className='inline-flex items-center gap-2 px-3 h-10 rounded-xl border text-sm font-semibold transition hover:brightness-110'
            style={{
              background: 'var(--accent, var(--primary, #244b2d))',
              borderColor: 'transparent',
              color: 'var(--accentText, #ffffff)'
            }}
          >
            <Plus size={16} />
            Novo
          </button>
        </div>

        <div className='mt-4 relative'>
          <Search
            size={16}
            className='absolute left-3 top-1/2 -translate-y-1/2'
            style={{ color: 'var(--muted)' }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Buscar pelo nome'
            aria-label='Buscar vaca pelo nome'
            className='w-full h-11 pl-10 pr-3 rounded-xl border outline-none'
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          />
        </div>

        <div className='mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3'>
          <StatCard
            label='Total de Vacas'
            value={String(cows.length)}
            variant='tinted'
            accentColor={cowCardColors.accent}
            backgroundTintColor={cowCardColors.background}
            borderColor={cowCardColors.border}
            icon={<MaskIcon src={cowIcon} size={26} color={cowCardColors.accent} />}
          />
          <StatCard
            label='Partos (30 dias)'
            value={String(calvingsLast30Days)}
            variant='tinted'
            accentColor={birthsCardColors.accent}
            backgroundTintColor={birthsCardColors.background}
            borderColor={birthsCardColors.border}
            icon={<MaskIcon src={calfIcon} size={26} color={birthsCardColors.accent} />}
          />
          <StatCard
            label='Fêmeas'
            value={String(calvings.filter((event) => event.sex === 'FEMEA').length)}
            variant='tinted'
            accentColor='var(--accent)'
            backgroundTintColor='var(--surface)'
            borderColor='var(--border)'
          />
          <StatCard
            label='Machos'
            value={String(calvings.filter((event) => event.sex === 'MACHO').length)}
            variant='tinted'
            accentColor='var(--accent)'
            backgroundTintColor='var(--mint)'
            borderColor='var(--border)'
          />
        </div>
      </div>

      <h2 className='agro-section-title'>Vacas</h2>
      <div className='grid gap-3 sm:grid-cols-2'>
        {rows.length === 0 ? (
          <div
            className='col-span-full rounded-2xl p-5 border text-sm'
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
            {search.trim() ? 'Nenhuma vaca encontrada.' : 'Cadastre a primeira vaca em Novo.'}
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
                className="w-full text-left rounded-2xl p-4 border transition hover:brightness-110"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div className='flex items-center gap-3'>
                  <span className='cow-birth-thumb'>
                    {r.cow.photoDataUrl
                      ? <img src={r.cow.photoDataUrl} alt='' loading='lazy' />
                      : <MaskIcon src={cowIcon} size={30} color='var(--accent)' />}
                  </span>
                  <div className='min-w-0 flex-1'>
                    <div className='truncate text-base font-bold'>
                      {r.cow.name}
                    </div>
                    <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                      {lastEvent
                        ? `Último parto: ${lastDateLabel}${lastSexLabel ? ` · ${lastSexLabel}` : ''}`
                        : 'Nenhum parto registrado'}
                    </div>
                    {elapsedLabel && (
                      <div
                        className="text-xs font-semibold mt-1"
                        style={{ color: "var(--accent, #b8ff2c)" }}
                      >
                        {elapsedLabel}
                      </div>
                    )}
                  </div>
                  <div
                    className='flex shrink-0 items-center gap-1 rounded-lg px-2 py-1'
                    style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
                  >
                    <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                      {r.count} {r.count === 1 ? 'parto' : 'partos'}
                    </span>
                    <ChevronRight size={15} aria-hidden='true' />
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

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

      <CowDetailsModal
        open={isCowModalOpen}
        cow={currentCow}
        events={cowEvents}
        onClose={() => {
          setIsCowModalOpen(false)
          setSelectedCow(null)
        }}
        onEditCalving={(ev) => {
          setEditingCalving(ev)
          setIsNewCalvingOpen(true)
        }}
        onNewCalving={() => {
          setEditingCalving(null)
          setIsNewCalvingOpen(true)
        }}
      />

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

function CowDetailsModal({
  open,
  cow,
  events,
  onClose,
  onNewCalving,
  onEditCalving
}: {
  open: boolean
  cow: Cow | null
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
  const [isCowPhotoOpen, setIsCowPhotoOpen] = useState(false)
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
    if (!open) {
      setGalleryEvent(null)
      setIsCowPhotoOpen(false)
      setActiveEventMenu(null)
    }
  }, [open])

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

  const handleRemoveCowPhoto = async () => {
    if (!cow?.photoDataUrl) return
    try {
      await offlineWrites.saveCow({ ...cow, photoDataUrl: null })
      setIsCowPhotoOpen(false)
      showToast('Foto removida')
    } catch (error) {
      console.error('Falha ao remover foto da vaca', error)
      showToast('Não foi possível remover a foto.', 'error')
    }
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
      setGalleryEvent((current) => current?.id === event.id ? nextEvent : current)
      showToast('Foto adicionada')
    } catch (e) {
      console.error('Falha ao adicionar foto do parto', e)
      showToast('Não foi possível adicionar a foto.', 'error')
      return false
    }
    return true
  }

  const handleRemovePhotoFromEvent = async (event: CalvingEvent, index: number) => {
    const photos = getEventPhotos(event)
    if (!photos.length) return false
    const confirmRemove = window.confirm('Remover esta foto?')
    if (!confirmRemove) return false
    const nextPhotos = photos.filter((_, idx) => idx !== index)
    const nextEvent = { ...event, photos: nextPhotos, photoDataUrl: nextPhotos[0] ?? null }
    try {
      await offlineWrites.saveCalving(nextEvent)
      setGalleryEvent((current) => current?.id === event.id ? nextEvent : current)
      showToast('Foto removida')
    } catch (e) {
      console.error('Falha ao remover foto do parto', e)
      showToast('Não foi possível remover a foto.', 'error')
      return false
    }
    return true
  }

  const lastEvent = events[0]
  const breedLabel = cow?.breed || cow?.raca
  const statusLabel = cow?.status

  const handleAvatarClick = () => {
    if (!cow) return
    if (cow.photoDataUrl) {
      setIsCowPhotoOpen(true)
    } else {
      setIsCowPhotoPickerOpen(true)
    }
  }

  return (
    <>
      <Modal
        open={open && Boolean(cow)}
        title='Perfil da vaca'
        variant='profile'
        onClose={onClose}
        closeLabel={<X size={19} />}
        closeAriaLabel='Fechar perfil'
        closeOnBackdrop
        actions={
          <button type='button' className='agro-icon-button' onClick={() => setIsActionsOpen(true)} aria-label='Ações da vaca'>
            <MoreVertical size={19} />
          </button>
        }
      >
        {cow && (
          <div className='cow-profile'>
            <section className='cow-profile-hero' aria-label='Dados da vaca'>
              <button type='button' className='cow-profile-photo' onClick={handleAvatarClick} aria-label={cow.photoDataUrl ? 'Abrir foto da vaca' : 'Adicionar foto da vaca'}>
                {cow.photoDataUrl
                  ? <img src={cow.photoDataUrl} alt={cow.name} />
                  : <MaskIcon src={cowIcon} size={72} color='var(--accent)' />}
                <span><Camera size={16} aria-hidden='true' />{cow.photoDataUrl ? 'Ver foto' : 'Adicionar foto'}</span>
              </button>
              <div className='cow-profile-identity'>
                {isEditingName ? (
                  <form className='space-y-2' onSubmit={(event) => { event.preventDefault(); saveName() }}>
                    <input autoFocus aria-label='Nome da vaca' value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} className='flat-input min-h-11 w-full px-3' />
                    <div className='flex flex-wrap gap-2'>
                      <button type='submit' className='agro-primary-button' disabled={!canSaveName || savingName}>
                        {savingName ? 'Salvando…' : 'Salvar'}
                      </button>
                      <button type='button' className='agro-secondary-button' onClick={() => { setIsEditingName(false); setNameDraft(cow.name) }}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <h3 className='cow-profile-name'>{cow.name}</h3>
                )}
                {(breedLabel || statusLabel) && (
                  <div className='flex flex-wrap gap-2'>
                    {breedLabel && <span className='cow-profile-chip'>{breedLabel}</span>}
                    {statusLabel && <span className='cow-profile-chip'>{statusLabel}</span>}
                  </div>
                )}
                <dl className='cow-profile-stats'>
                  <div><dt>Total de partos</dt><dd>{events.length}</dd></div>
                  <div><dt>Último parto</dt><dd>{lastEvent ? formatDateBR(lastEvent.date) : '—'}</dd></div>
                </dl>
              </div>
            </section>

            <section aria-labelledby='cow-history-title'>
              <div className='cow-history-heading'>
                <h3 id='cow-history-title' className='agro-section-title'>Histórico de partos</h3>
                <button type='button' onClick={onNewCalving} className='agro-primary-button'>
                  <Plus size={17} aria-hidden='true' /> Novo parto
                </button>
              </div>
              {events.length === 0 ? (
                <p className='agro-empty'>Nenhum parto registrado.</p>
              ) : (
                <ol className='cow-history-list'>
                  {events.map((event) => (
                    <BirthItemRow
                      key={event.id}
                      event={event}
                      onOpen={() => setGalleryEvent(event)}
                      onOpenMenu={() => setActiveEventMenu(event)}
                    />
                  ))}
                </ol>
              )}
            </section>
          </div>
        )}
      </Modal>

      <CalvingGalleryModal
        open={Boolean(galleryEvent)}
        event={galleryEvent}
        onClose={() => setGalleryEvent(null)}
        onAddPhoto={handleAddPhotoToEvent}
        onRemovePhoto={handleRemovePhotoFromEvent}
      />

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
                handleRemoveCowPhoto()
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
        open={isCowPhotoOpen}
        src={cow?.photoDataUrl || null}
        title={cow?.name || 'Foto da vaca'}
        onClose={() => setIsCowPhotoOpen(false)}
        onReplace={handlePickCowPhoto}
        onRemove={handleRemoveCowPhoto}
      />

      {toast ? (
        <div
          role='status'
          className='fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full border text-sm font-semibold shadow-lg'
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

function CalvingGalleryModal({
  open,
  event,
  onClose,
  onAddPhoto,
  onRemovePhoto
}: {
  open: boolean
  event: CalvingEvent | null
  onClose: () => void
  onAddPhoto: (event: CalvingEvent, photoDataUrl: string) => Promise<boolean>
  onRemovePhoto: (event: CalvingEvent, photoIndex: number) => Promise<boolean>
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [savingPhoto, setSavingPhoto] = useState(false)
  const cameraInputRef = React.useRef<HTMLInputElement>(null)
  const galleryInputRef = React.useRef<HTMLInputElement>(null)

  const photos = getEventPhotos(event)
  const hasPhotos = photos.length > 0
  const selectedIndex = Math.max(0, Math.min(activeIndex, photos.length - 1))

  React.useEffect(() => {
    if (!open) setIsPickerOpen(false)
  }, [open])

  React.useEffect(() => {
    setActiveIndex(0)
  }, [event?.id])

  React.useEffect(() => {
    if (!photos.length) {
      setActiveIndex(0)
      return
    }
    setActiveIndex((current) => Math.min(current, photos.length - 1))
  }, [photos.length])

  if (!open || !event) return null

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
    if (!file || savingPhoto) return
    setSavingPhoto(true)
    try {
      const processed = await preparePhotoFromFile(file)
      if (await onAddPhoto(event, processed)) setActiveIndex(photos.length)
    } catch (error) {
      console.error('Falha ao preparar foto do parto', error)
      alert('Não foi possível adicionar a foto. Tente novamente.')
    } finally {
      setSavingPhoto(false)
    }
  }

  const handleRemove = async () => {
    if (!hasPhotos || savingPhoto) return
    setSavingPhoto(true)
    try {
      if (await onRemovePhoto(event, selectedIndex)) {
        setActiveIndex(Math.min(selectedIndex, Math.max(0, photos.length - 2)))
      }
    } finally {
      setSavingPhoto(false)
    }
  }

  const goPrev = () => {
    if (!hasPhotos) return
    setActiveIndex((current) => (current - 1 + photos.length) % photos.length)
  }

  const goNext = () => {
    if (!hasPhotos) return
    setActiveIndex((current) => (current + 1) % photos.length)
  }

  return (
    <>
      <Modal
        open={open}
        title='Fotos do parto'
        variant='gallery'
        onClose={onClose}
        closeLabel={<X size={19} />}
        closeAriaLabel='Fechar galeria'
        closeOnBackdrop
      >
        <div className='calving-gallery'>
          <div className='calving-gallery-heading'>
            <div>
              <p className='agro-section-title'>{formatDateBR(event.date)}</p>
              <p className='text-sm text-[var(--muted)]'>{sexLabel(event.sex)} · {formatTimeSince(event.date)}</p>
            </div>
            <button type='button' className='agro-primary-button' onClick={() => setIsPickerOpen(true)} disabled={savingPhoto}>
              <Plus size={17} aria-hidden='true' /> Adicionar foto
            </button>
          </div>

          {hasPhotos ? (
            <>
              <div className='calving-gallery-stage'>
                <img src={photos[selectedIndex]} alt={`Foto ${selectedIndex + 1} do parto de ${formatDateBR(event.date)}`} />
                <span className='calving-gallery-count'>{selectedIndex + 1} / {photos.length}</span>
                {photos.length > 1 && (
                  <div className='calving-gallery-arrows'>
                    <button type='button' className='agro-icon-button' onClick={goPrev} aria-label='Foto anterior'><ChevronLeft size={20} /></button>
                    <button type='button' className='agro-icon-button' onClick={goNext} aria-label='Próxima foto'><ChevronRight size={20} /></button>
                  </div>
                )}
              </div>
              {photos.length > 1 && (
                <div className='calving-gallery-thumbs' role='group' aria-label='Miniaturas das fotos'>
                  {photos.map((photo, index) => (
                    <button key={index} type='button' onClick={() => setActiveIndex(index)} aria-label={`Abrir foto ${index + 1}`} aria-pressed={index === selectedIndex}>
                      <img src={photo} alt='' loading='lazy' />
                    </button>
                  ))}
                </div>
              )}
              <button type='button' className='agro-secondary-button calving-gallery-remove' onClick={handleRemove} disabled={savingPhoto}>
                Remover foto selecionada
              </button>
            </>
          ) : (
            <div className='agro-empty calving-gallery-empty'>
              <Image size={28} aria-hidden='true' />
              Nenhuma foto neste parto.
            </div>
          )}
        </div>
      </Modal>

      <ActionSheet open={isPickerOpen} onClose={() => setIsPickerOpen(false)}>
        <div className='flex flex-col gap-1'>
          <button
            type='button'
            onClick={() => triggerPick('camera')}
            className='w-full text-left px-3 py-3 rounded-xl transition hover:brightness-110 flex items-center gap-2'
            style={{ color: 'var(--text)' }}
          >
            <Camera size={16} />
            Tirar foto
          </button>
          <button
            type='button'
            onClick={() => triggerPick('gallery')}
            className='w-full text-left px-3 py-3 rounded-xl transition hover:brightness-110 flex items-center gap-2'
            style={{ color: 'var(--text)' }}
          >
            <Image size={16} />
            Escolher da galeria
          </button>
          <button
            type='button'
            onClick={() => setIsPickerOpen(false)}
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
        className='cow-image-viewer fixed inset-0 z-50 flex flex-col'
        role='dialog'
        aria-label={title}
        onClick={onClose}
      >
        <div className='flex flex-col h-full min-h-0 w-full max-w-5xl mx-auto' onClick={(e) => e.stopPropagation()}>
          <div className='flex flex-wrap items-center justify-between gap-2 pb-3'>
            <div className='text-base font-semibold text-white'>
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
                  Original
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
            className='cow-image-viewport relative min-h-0 flex-1 overflow-auto rounded-2xl'
            style={{ borderColor: 'var(--border)' }}
            onWheel={(e) => {
              if (!e.ctrlKey) return
              e.preventDefault()
              adjustZoom(e.deltaY > 0 ? -0.1 : 0.1)
            }}
          >
            <div className='flex items-center justify-center' style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
              <img
                src={src}
                alt={title}
                className='h-full w-full object-contain'
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
              background: 'linear-gradient(180deg, #ffffff 0%, #f1f6ef 100%)',
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
              background: 'linear-gradient(180deg, #ffffff 0%, #f1f6ef 100%)',
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
                      color: isTodaySelected ? '#ffffff' : 'var(--text)',
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
                      color: isYesterdaySelected ? '#ffffff' : 'var(--text)',
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
                    background: sex === 'MACHO' ? 'rgba(184, 255, 44, 0.12)' : 'var(--surface-2)',
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
                    background: sex === 'FEMEA' ? 'rgba(184, 255, 44, 0.12)' : 'var(--surface-2)',
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
              background: 'linear-gradient(180deg, #ffffff 0%, #f1f6ef 100%)',
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
                background: '#244b2d',
                borderColor: '#244b2d',
                color: '#ffffff',
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
              color: 'var(--accentText, #ffffff)'
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
