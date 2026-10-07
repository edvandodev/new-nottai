import React, { useMemo, useState } from 'react'
import {
  CalendarDays,
  Camera,
  Circle,
  CircleDot,
  Image,
  MoreVertical,
  Plus,
  Search,
  Trash2,
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

const cowCardColors = {
  accent: '#527b38',
  background: '#eff6d9',
  border: '#dce9c1'
}

const iconColor = '#718074'

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


const dividerColor = '#1e2a38'

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

const CowHeader = ({ name, subtitle }: { name: string; subtitle?: string }) => (
  <div className='flex flex-col gap-1 text-left'>
    <div className='text-base font-semibold leading-tight' style={{ color: 'var(--text)' }}>
      Perfil da vaca
    </div>
    {subtitle ? (
      <div className='text-sm' style={{ color: 'var(--muted)' }}>
        {name} · {subtitle}
      </div>
    ) : null}
  </div>
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
    <div className='space-y-3'>
      <div className='relative h-[210px] overflow-hidden rounded-[24px] border' style={{ background: 'var(--accent-soft)', borderColor: 'var(--border)' }}>
        {cow.photoDataUrl ? (
          <img src={cow.photoDataUrl} alt={`Foto de ${cow.name}`} className='absolute inset-0 h-full w-full object-cover' />
        ) : (
          <div className='absolute inset-0 flex items-center justify-center' style={{ background: 'linear-gradient(135deg, #eaf2df, #dce9c1)' }}>
            <MaskIcon src={cowIcon} size={112} color='#527b38' />
          </div>
        )}
        {cow.photoDataUrl ? <div className='absolute inset-0' style={{ background: 'linear-gradient(180deg, rgba(20,35,23,.02) 25%, rgba(20,35,23,.78) 100%)' }} /> : null}
        <button
          type='button'
          onClick={onAvatarClick}
          className='absolute inset-0 z-10'
          aria-label={cow.photoDataUrl ? `Abrir foto de ${cow.name}` : `Adicionar foto de ${cow.name}`}
        />
        <div className='absolute inset-x-4 bottom-4 z-20 pointer-events-none'>
          <p className='text-[9px] font-bold uppercase tracking-[.16em]' style={{ color: cow.photoDataUrl ? 'rgba(255,255,255,.8)' : 'var(--primary)' }}>Perfil do animal</p>
          <p className='mt-1 text-[26px] font-bold leading-tight truncate' style={{ color: cow.photoDataUrl ? '#fff' : 'var(--primary)' }}>{cow.name || initial}</p>
          <div className='mt-2 flex flex-wrap gap-2'>
            {idLabel ? <InfoChip label={`ID ${idLabel}`} /> : null}
            {breed ? <InfoChip label={breed} /> : null}
            {status ? <InfoChip label={status} tone='accent' /> : null}
          </div>
        </div>
        <button
          type='button'
          onClick={onAvatarClick}
          aria-label={cow.photoDataUrl ? 'Ver e trocar foto' : 'Adicionar foto'}
          className='absolute right-3 top-3 z-30 h-10 w-10 rounded-full border flex items-center justify-center shadow-sm'
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--primary)' }}
        >
          <Camera size={17} />
        </button>
      </div>

      {isEditingName && (
        <div className='flat-card p-3 space-y-2'>
          <label className='text-xs font-semibold' style={{ color: 'var(--muted)' }}>Nome da vaca</label>
          <input
            value={nameDraft}
            onChange={(e) => onNameChange(e.target.value)}
            className='w-full h-11 rounded-xl border px-3 outline-none'
            placeholder='Nome da vaca'
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
          <div className='flex gap-2'>
            <button type='button' onClick={onSaveName} disabled={!canSaveName || savingName} className='h-10 px-4 rounded-xl text-sm font-semibold disabled:opacity-60' style={{ background: 'var(--primary)', color: '#fff' }}>
              {savingName ? 'Salvando...' : 'Salvar nome'}
            </button>
            <button type='button' onClick={onCancelEdit} className='h-10 px-3 rounded-xl text-sm font-semibold border' style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
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
      role='button'
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()}
      className='w-full flex items-center gap-3 px-3 py-3 text-left transition hover:brightness-105 cursor-pointer'
      style={{
        color: 'var(--text)',
        borderTop: isFirst ? 'none' : `1px solid ${dividerColor}`
      }}
    >
      <div className='h-14 w-14 shrink-0 overflow-hidden rounded-xl border flex items-center justify-center' style={{ background: 'var(--accent-soft)', borderColor: 'var(--border)' }}>
        {getEventPhotos(event).length ? <img src={getEventPhotos(event)[0]} alt='' className='h-full w-full object-cover' /> : <Camera size={18} style={{ color: 'var(--primary)' }} />}
      </div>
      <div className='flex-1 min-w-0'>
        <div className='text-sm font-bold'>{formatDateBR(event.date)}</div>
        <div className='mt-1 text-xs' style={{ color: 'var(--muted)' }}>{timeSinceLabel}</div>
        <div className='mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold' style={{ background: event.sex === 'FEMEA' ? 'rgba(255, 90, 106, 0.1)' : 'rgba(53, 125, 82, 0.12)', color: 'var(--primary)' }}>{sexLabel(event.sex)}</div>
      </div>
      <div className='flex items-center gap-1'>
        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation()
            onOpenMenu()
          }}
          aria-label='Acoes do parto'
          className='h-8 w-8 rounded-full flex items-center justify-center transition'
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
        >
          <MoreVertical size={14} />
        </button>
      </div>
    </div>
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

  const cowEvents = useMemo(() => {
    if (!selectedCow) return []
    return calvingsByCow.get(selectedCow.id) || []
  }, [selectedCow, calvingsByCow])

  return (
    <div className='max-w-2xl mx-auto space-y-4'>
      <section className='relative overflow-hidden rounded-[28px] p-5 sm:p-6' style={{ background: 'var(--primary)', color: '#fff', boxShadow: '0 20px 44px -30px rgba(31, 68, 40, .55)' }}>
        <div className='pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full' style={{ background: 'rgba(206, 235, 143, .16)' }} />
        <div className='relative flex items-start justify-between gap-3'>
          <div>
            <div className='inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold' style={{ background: 'rgba(255,255,255,.13)', color: '#eff8df' }}><CalendarDays size={13} /> ACOMPANHAMENTO DO REBANHO</div>
            <h1 className='mt-3 text-2xl font-bold tracking-tight'>Reprodução</h1>
            <p className='mt-1 max-w-xs text-sm' style={{ color: 'rgba(255,255,255,.76)' }}>Partos, fotos e histórico de cada vaca em um só lugar.</p>
          </div>
          <button type='button' onClick={() => { setEditingCalving(null); setIsNewMenuOpen(true) }} className='inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold transition hover:brightness-105' style={{ background: '#d9edab', color: '#244b2d' }}><Plus size={17} /> Novo</button>
        </div>
        <div className='relative mt-5 grid grid-cols-2 gap-3'>
          <div className='rounded-2xl p-3.5' style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.14)' }}><div className='text-xs' style={{ color: 'rgba(255,255,255,.76)' }}>Vacas no rebanho</div><div className='mt-1 text-3xl font-bold'>{cows.length}</div></div>
          <div className='rounded-2xl p-3.5' style={{ background: '#d9edab', color: '#244b2d' }}><div className='text-xs font-medium' style={{ color: 'rgba(36,75,45,.72)' }}>Partos nos últimos 30 dias</div><div className='mt-1 text-3xl font-bold'>{calvingsLast30Days}</div></div>
        </div>
      </section>
      <div className='relative'>
        <Search size={17} className='absolute left-4 top-1/2 -translate-y-1/2' style={{ color: 'var(--muted)' }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Buscar vaca pelo nome...' className='w-full h-12 pl-11 pr-4 rounded-2xl border outline-none' style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }} />
      </div>
      <div className='space-y-2.5'>
        <div className='flex items-center justify-between px-1'><div className='text-sm font-bold' style={{ color: 'var(--text)' }}>Seu rebanho</div><span className='text-xs font-medium' style={{ color: 'var(--muted)' }}>{rows.length} {rows.length === 1 ? 'vaca' : 'vacas'}</span></div>
        {rows.length === 0 ? (
          <div className='rounded-2xl p-5 border text-sm' style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' }}>Nenhuma vaca encontrada. Toque em <b>Novo</b> para cadastrar o primeiro.</div>
        ) : rows.map((r) => {
          const lastEvent = r.lastEvent
          const lastDateLabel = lastEvent ? formatDateBR(lastEvent.date) : null
          const lastSexLabel = lastEvent ? sexLabel(lastEvent.sex) : null
          const elapsedLabel = lastEvent ? formatTimeSince(lastEvent.date) : null
          return (
            <button key={r.cow.id} type='button' onClick={() => openCow(r.cow)} className='w-full text-left rounded-2xl p-3.5 border transition hover:brightness-105' style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className='flex items-center gap-3'>
                <div className='h-14 w-14 shrink-0 overflow-hidden rounded-2xl border flex items-center justify-center' style={{ background: 'var(--accent-soft)', borderColor: 'var(--border)' }}>{r.cow.photoDataUrl ? <img src={r.cow.photoDataUrl} alt='' className='h-full w-full object-cover' /> : <MaskIcon src={cowIcon} size={29} color={cowCardColors.accent} />}</div>
                <div className='min-w-0 flex-1'><div className='truncate text-sm font-bold' style={{ color: 'var(--text)' }}>{r.cow.name}</div><div className='mt-1 text-xs' style={{ color: 'var(--muted)' }}>{lastEvent ? `Último parto: ${lastDateLabel}${lastSexLabel ? ` · ${lastSexLabel}` : ''}` : 'Sem partos registrados'}</div><div className='mt-2'>{elapsedLabel ? <span className='rounded-full px-2 py-0.5 text-[10px] font-semibold' style={{ background: 'var(--accent-soft)', color: 'var(--primary)' }}>{elapsedLabel}</span> : <span className='text-[10px]' style={{ color: 'var(--muted)' }}>Toque para ver o perfil</span>}</div></div>
                <div className='min-w-12 rounded-2xl border px-3 py-2 text-center' style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}><span className='block text-base font-bold' style={{ color: 'var(--primary)' }}>{r.count}</span><span className='block text-[9px] uppercase tracking-wide' style={{ color: 'var(--muted)' }}>partos</span></div>
              </div>
            </button>
          )
        })}
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
        cow={selectedCow}
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
    if (!open) setGalleryEvent(null)
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
    const confirmRemove = window.confirm('Remover esta foto?')
    if (!confirmRemove) return
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
  const lastEventLabel = lastEvent ? `Ultimo parto ${formatTimeSince(lastEvent.date)}` : null
  const subtitleParts: string[] = []
  if (lastEventLabel) subtitleParts.push(lastEventLabel)
  if (!lastEventLabel && events.length === 0) subtitleParts.push('Sem partos registrados')
  const headerSubtitle = subtitleParts.join(' \u2022 ')

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
      <Modal
        open={open}
        title={cow ? <CowHeader name={cow.name} subtitle={headerSubtitle || undefined} /> : 'Partos'}
        onClose={onClose}
        closeLabel={<X size={14} />}
        closeAriaLabel='Fechar'
        closeOnBackdrop
        actions={
          cow ? (
            <button
              type='button'
              onClick={() => setIsActionsOpen(true)}
              aria-label='Acoes da vaca'
              className='h-9 w-9 rounded-full border flex items-center justify-center transition hover:brightness-110'
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--muted)' }}
            >
              <MoreVertical size={16} />
            </button>
          ) : null
        }
      >
        {!cow ? (
          skeleton
        ) : (
          <div className='space-y-5'>
            <div
              className='-mx-6 border-b pb-1'
              style={{ borderColor: 'var(--border)', opacity: 0.5 }}
            />

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
              <div className='relative overflow-hidden rounded-2xl border p-4' style={{ background: 'var(--primary)', borderColor: 'var(--primary)', color: '#fff' }}>
                <div className='absolute -right-3 -top-5 h-16 w-16 rounded-full' style={{ background: 'rgba(255,255,255,.1)' }} />
                <div className='relative text-xs font-medium' style={{ color: 'rgba(255,255,255,.78)' }}>Partos registrados</div>
                <div className='relative mt-1 text-2xl font-bold'>{events.length}</div>
              </div>
              <div className='rounded-2xl border p-4' style={{ background: '#edf5dc', borderColor: '#dce9c1' }}>
                <div className='text-xs font-medium' style={{ color: 'var(--primary)' }}>Último parto</div>
                <div className='mt-1 text-sm font-bold' style={{ color: 'var(--text)' }}>
                  {lastEvent ? formatDateBR(lastEvent.date) : 'Sem registros'}
                </div>
                {lastEvent ? <div className='mt-1 text-[10px]' style={{ color: 'var(--muted)' }}>{formatTimeSince(lastEvent.date)}</div> : null}
              </div>
            </div>

            <div className='space-y-2.5'>
              <div className='flex items-end justify-between px-1'>
                <div>
                  <div className='text-base font-bold' style={{ color: 'var(--text)' }}>Histórico de partos</div>
                  <div className='mt-0.5 text-xs' style={{ color: 'var(--muted)' }}>Fotos e informações por nascimento</div>
                </div>
                <span className='rounded-full px-2.5 py-1 text-xs font-semibold' style={{ background: 'var(--accent-soft)', color: 'var(--primary)' }}>{events.length}</span>
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
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
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
                className='w-full h-12 rounded-full border text-sm font-bold inline-flex items-center justify-center gap-2 transition hover:brightness-105'
                style={{
                  background: 'var(--primary)',
                  borderColor: 'var(--primary)',
                  color: '#fff'
                }}
              >
                <Plus size={16} />
                Novo parto
              </button>
            </div>
          </div>
        )}
      </Modal>

      <CalvingGalleryModal
        open={Boolean(galleryEvent)}
        event={galleryEvent}
        cowName={cow?.name || 'Animal'}
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

function CalvingGalleryModal({
  open,
  event,
  cowName,
  onClose,
  onAddPhoto,
  onRemovePhoto
}: {
  open: boolean
  event: CalvingEvent | null
  cowName: string
  onClose: () => void
  onAddPhoto: (event: CalvingEvent, photoDataUrl: string) => Promise<void>
  onRemovePhoto: (event: CalvingEvent, photoIndex: number) => Promise<void>
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const cameraInputRef = React.useRef<HTMLInputElement>(null)
  const galleryInputRef = React.useRef<HTMLInputElement>(null)

  const photos = getEventPhotos(event)
  const hasPhotos = photos.length > 0

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
    if (!file) return
    try {
      const processed = await preparePhotoFromFile(file)
      await onAddPhoto(event, processed)
      setActiveIndex(photos.length)
    } catch (e) {
      console.error('Falha ao adicionar foto do parto', e)
      alert('Nao foi possivel adicionar a foto. Tente novamente.')
    }
  }

  const handleRemove = async () => {
    if (!hasPhotos) return
    try {
      await onRemovePhoto(event, activeIndex)
      setActiveIndex((current) => Math.max(0, Math.min(current, photos.length - 2)))
    } catch (e) {
      console.error('Falha ao remover foto do parto', e)
      alert('Nao foi possivel remover a foto.')
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
      <div className='fixed inset-0 z-[70] flex items-end justify-center bg-black/65 sm:items-center sm:p-4' onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <section role='dialog' aria-modal='true' aria-label='Detalhe do parto' className='flex h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] sm:h-[min(90dvh,780px)] sm:rounded-[28px]' style={{ background: 'var(--surface)' }}>
          <div className='relative h-[56%] min-h-[280px] shrink-0 overflow-hidden' style={{ background: 'linear-gradient(135deg, #eaf2df, #dce9c1)' }}>
            {hasPhotos ? <img src={photos[activeIndex]} alt={`Foto do parto de ${cowName}`} className='h-full w-full object-cover' /> : <div className='flex h-full flex-col items-center justify-center gap-3' style={{ color: 'var(--primary)' }}><Camera size={44} strokeWidth={1.4} /><span className='text-sm font-semibold'>Adicione uma foto deste parto</span></div>}
            <div className='absolute inset-x-0 top-0 flex items-start justify-between p-4' style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.48), transparent)' }}>
              <button type='button' onClick={onClose} aria-label='Fechar detalhe' className='flex h-10 w-10 items-center justify-center rounded-full border text-white backdrop-blur-sm' style={{ background: 'rgba(0,0,0,.32)', borderColor: 'rgba(255,255,255,.35)' }}><X size={18} /></button>
              {hasPhotos ? <span className='rounded-full px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm' style={{ background: 'rgba(0,0,0,.38)' }}>{activeIndex + 1} / {photos.length}</span> : null}
            </div>
            {photos.length > 1 ? <div className='absolute inset-y-0 left-0 right-0 flex items-center justify-between px-3 pointer-events-none'><button type='button' onClick={goPrev} aria-label='Foto anterior' className='pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full text-white backdrop-blur-sm' style={{ background: 'rgba(0,0,0,.4)' }}>{'‹'}</button><button type='button' onClick={goNext} aria-label='Próxima foto' className='pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full text-white backdrop-blur-sm' style={{ background: 'rgba(0,0,0,.4)' }}>{'›'}</button></div> : null}
          </div>
          <div className='flex-1 overflow-y-auto px-5 pb-5 pt-5 sm:px-6'>
            <div className='flex items-start justify-between gap-3'>
              <div><div className='text-xs font-semibold uppercase tracking-wider' style={{ color: 'var(--primary)' }}>Detalhe do parto</div><h2 className='mt-1 text-2xl font-bold' style={{ color: 'var(--text)' }}>{formatDateBR(event.date)}</h2><div className='mt-1 text-sm' style={{ color: 'var(--muted)' }}>{cowName} · {formatTimeSince(event.date)}</div></div>
              <span className='shrink-0 rounded-full px-3 py-1.5 text-xs font-bold' style={{ background: event.sex === 'FEMEA' ? 'rgba(255, 90, 106, .1)' : 'var(--accent-soft)', color: 'var(--primary)' }}>{sexLabel(event.sex)}</span>
            </div>
            <div className='mt-5 grid grid-cols-2 gap-3'>
              <div className='rounded-2xl p-3.5' style={{ background: 'var(--accent-soft)' }}><div className='text-[11px]' style={{ color: 'var(--muted)' }}>Nascimento</div><div className='mt-1 text-sm font-bold' style={{ color: 'var(--text)' }}>{formatDateBR(event.date)}</div></div>
              <div className='rounded-2xl p-3.5' style={{ background: 'var(--surface-2)' }}><div className='text-[11px]' style={{ color: 'var(--muted)' }}>Tempo desde o parto</div><div className='mt-1 text-sm font-bold' style={{ color: 'var(--text)' }}>{formatTimeSince(event.date)}</div></div>
            </div>
            <div className='mt-5 flex gap-2'>
              <button type='button' onClick={() => setIsPickerOpen(true)} className='inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full text-sm font-bold' style={{ background: 'var(--primary)', color: '#fff' }}><Plus size={16} />Adicionar foto</button>
              {hasPhotos ? <button type='button' onClick={handleRemove} aria-label='Remover foto atual' className='inline-flex h-11 w-12 items-center justify-center rounded-full border' style={{ borderColor: 'var(--border)', color: 'var(--danger)', background: 'var(--surface)' }}><Trash2 size={17} /></button> : null}
            </div>
          </div>
        </section>
      </div>
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
        className='fixed inset-0 z-50 flex flex-col p-4'
        style={{ background: 'var(--bg)' }}
        onClick={onClose}
      >
        <div className='flex flex-col h-full w-full max-w-5xl mx-auto' onClick={(e) => e.stopPropagation()}>
          <div className='flex items-center justify-between gap-2 pb-3'>
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
            className='flex-1 overflow-auto rounded-[24px] border'
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
            onWheel={(e) => {
              if (!e.ctrlKey) return
              e.preventDefault()
              adjustZoom(e.deltaY > 0 ? -0.1 : 0.1)
            }}
          >
            <div className='min-h-full min-w-full flex items-center justify-center p-3'>
              <img
                src={src}
                alt={title}
                className='object-contain rounded-2xl'
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
              background: 'linear-gradient(180deg, #111924 0%, #0f1620 100%)',
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
              background: 'linear-gradient(180deg, #111924 0%, #0f1620 100%)',
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
                      color: isTodaySelected ? '#0a120a' : 'var(--text)',
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
                      color: isYesterdaySelected ? '#0a120a' : 'var(--text)',
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
              background: 'linear-gradient(180deg, #111924 0%, #0f1620 100%)',
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




















