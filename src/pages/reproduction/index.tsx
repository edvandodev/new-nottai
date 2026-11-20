import React, { useMemo, useState } from 'react'
import {
  CalendarDays,
  Camera,
  Circle,
  CircleDot,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Maximize2,
  Image as ImageIcon,
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
import './reproduction.css'

type ReproductionPageProps = {
  cows: Cow[]
  calvings: CalvingEvent[]
  onDetailsViewChange?: (isOpen: boolean) => void
}

function AnimalIcon({ src }: { src: string }) {
  return <span className='animal-icon' aria-hidden='true' style={{ maskImage: 'url(' + src + ')' }} />
}

function CowPortrait({ cow }: { cow: Cow }) {
  return cow.photoDataUrl
    ? <img src={cow.photoDataUrl} alt='' />
    : <AnimalIcon src={cowIcon} />
}

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
  photos,
  onOpen,
  onOpenMenu
}: {
  event: CalvingEvent
  photos: string[]
  onOpen: () => void
  onOpenMenu: () => void
}) {
  const date = formatDateBR(event.date)
  return (
    <li className='birth-row'>
      <button type='button' className='birth-entry' onClick={onOpen}>
        <span className='birth-thumb'>
          {photos.length ? <img src={photos[0]} alt='' loading='lazy' /> : <AnimalIcon src={calfIcon} />}
        </span>
        <span className='birth-copy'>
          <strong>{date}</strong>
          <span>{sexLabel(event.sex)}{photos.length > 0 && ' · ' + photos.length + (photos.length === 1 ? ' foto' : ' fotos')}</span>
        </span>
        <ChevronRight className='birth-chevron' size={17} aria-hidden='true' />
      </button>
      <button type='button' className='ui-icon-button birth-menu' aria-label={'Ações do parto de ' + date} onClick={onOpenMenu}>
        <MoreVertical size={18} aria-hidden='true' />
      </button>
    </li>
  )
}

export function ReproductionPage({ cows, calvings, onDetailsViewChange }: ReproductionPageProps) {
  const [search, setSearch] = useState('')
  const [selectedCow, setSelectedCow] = useState<Cow | null>(null)
  const [isNewCowOpen, setIsNewCowOpen] = useState(false)
  const [isNewCalvingOpen, setIsNewCalvingOpen] = useState(false)
  const [editingCalving, setEditingCalving] = useState<CalvingEvent | null>(null)

  const closeCow = React.useCallback(() => {
    setSelectedCow(null)
    onDetailsViewChange?.(false)
  }, [onDetailsViewChange])

  React.useEffect(() => {
    window.addEventListener('nottai:back-to-cow-list', closeCow)
    return () => window.removeEventListener('nottai:back-to-cow-list', closeCow)
  }, [closeCow])

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
    const normalize = (value: string) => value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu, '')
    const q = normalize(search.trim())
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
      .filter(({ cow }) => !q || [cow.name, cow.idLabel, cow.tag, cow.breed, cow.raca].some((value) => value && normalize(value).includes(q)))
      .sort((a, b) => {
        if (b.lastDate !== a.lastDate) return b.lastDate - a.lastDate
        return a.cow.name.localeCompare(b.cow.name, 'pt-BR')
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
      return time >= cutoff && time <= now ? count + 1 : count
    }, 0)
  }, [calvings, cows])

  const openCow = (cow: Cow) => {
    setSelectedCow(cow)
    onDetailsViewChange?.(true)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const activeCow = useMemo(() => {
    if (!selectedCow) return null
    return cows.find((cow) => cow.id === selectedCow.id) || selectedCow
  }, [cows, selectedCow])

  const cowEvents = useMemo(() => {
    if (!activeCow) return []
    return calvingsByCow.get(activeCow.id) || []
  }, [activeCow, calvingsByCow])

  const startCalving = () => {
    setEditingCalving(null)
    setIsNewCalvingOpen(true)
  }

  return (
    <div className='reproduction-page'>
      {activeCow ? (
        <CowDetailsPage
          key={activeCow.id}
          cow={activeCow}
          events={cowEvents}
          onClose={closeCow}
          onEditCalving={(event) => {
            setEditingCalving(event)
            setIsNewCalvingOpen(true)
          }}
          onNewCalving={startCalving}
        />
      ) : (
        <>
          <header className='ui-page-heading herd-heading'>
            <div>
              <h1>Reprodução</h1>
              <p>Acompanhe suas vacas e os partos do rebanho.</p>
            </div>
            <div className='herd-actions'>
              <button type='button' className='ui-button' onClick={() => setIsNewCowOpen(true)}>
                <Plus size={18} aria-hidden='true' /> Nova vaca
              </button>
              <button type='button' className='ui-button ui-button-primary' onClick={startCalving}>
                <CalendarDays size={18} aria-hidden='true' /> Registrar parto
              </button>
            </div>
          </header>

          <section className='herd-metrics' aria-label='Resumo do rebanho'>
            <div className='herd-metric'>
              <span className='herd-metric-icon'><AnimalIcon src={cowIcon} /></span>
              <div><span>Vacas cadastradas</span><strong>{cows.length}</strong></div>
            </div>
            <div className='herd-metric'>
              <span className='herd-metric-icon'><AnimalIcon src={calfIcon} /></span>
              <div><span>Partos em 30 dias</span><strong>{calvingsLast30Days}</strong></div>
            </div>
          </section>

          <section className='herd-directory' aria-labelledby='herd-title'>
            <div className='herd-directory-header'>
              <h2 id='herd-title'>Minhas vacas</h2>
              <label className='herd-search'>
                <Search size={19} aria-hidden='true' />
                <input
                  type='search'
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label='Buscar vaca por nome, brinco ou raça'
                  placeholder='Buscar por nome, brinco ou raça'
                />
              </label>
            </div>

            {rows.length ? (
              <ul className='herd-list'>
                {rows.map(({ cow, lastEvent, count }) => (
                  <li key={cow.id}>
                    <button type='button' className='herd-row' onClick={() => openCow(cow)}>
                      <span className='herd-portrait'><CowPortrait cow={cow} /></span>
                      <span className='herd-row-copy'>
                        <strong>{cow.name}</strong>
                        {(cow.idLabel || cow.tag) && <span className='herd-tag'>Brinco {cow.idLabel || cow.tag}</span>}
                        <span>{lastEvent ? 'Último parto em ' + formatDateBR(lastEvent.date) : 'Sem partos registrados'}</span>
                      </span>
                      <span className='herd-count'>{count} {count === 1 ? 'parto' : 'partos'}</span>
                      <ChevronRight size={18} className='herd-chevron' aria-hidden='true' />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className='herd-empty'>
                <span className='herd-metric-icon'><AnimalIcon src={cowIcon} /></span>
                <strong>{cows.length ? 'Nenhuma vaca encontrada' : 'Cadastre sua primeira vaca'}</strong>
                <p>{cows.length ? 'Tente outro nome, brinco ou raça.' : 'O histórico de cada vaca aparece aqui.'}</p>
              </div>
            )}
          </section>
        </>
      )}

      {isNewCalvingOpen && <CalvingModal
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
      />}

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

  if (!cow) return null

  const lastEvent = events[0]
  const tag = cow.idLabel || cow.tag
  const breed = cow.breed || cow.raca
  const handleAvatarClick = () => {
    if (cow.photoDataUrl) openPhotoViewer(cow.photoDataUrl, cow.name, undefined, 'cow')
    else setIsCowPhotoPickerOpen(true)
  }

  return (
    <>
      <section className='cow-profile-screen' aria-labelledby='cow-profile-title'>
        <div className='cow-profile-toolbar'>
          <button type='button' onClick={onClose} className='ui-button cow-return'>
            <ChevronLeft size={19} aria-hidden='true' /> Reprodução
          </button>
          <button type='button' className='ui-button' onClick={() => setIsActionsOpen(true)} aria-label='Ações da vaca'>
            <MoreVertical size={18} aria-hidden='true' /> <span>Opções</span>
          </button>
        </div>

        <div className='cow-profile-hero'>
          <button
            type='button'
            className='cow-hero-photo'
            onClick={handleAvatarClick}
            aria-label={cow.photoDataUrl ? 'Ampliar foto de ' + cow.name : 'Adicionar foto de ' + cow.name}
          >
            <CowPortrait cow={cow} />
            <span className='cow-photo-control' aria-hidden='true'>
              {cow.photoDataUrl ? <Maximize2 size={17} /> : <><Camera size={17} /> Adicionar foto</>}
            </span>
          </button>

          <div className='cow-profile-info'>
            {isEditingName ? (
              <form className='cow-name-form' onSubmit={(event) => { event.preventDefault(); if (canSaveName && !savingName) void saveName() }}>
                <h1 id='cow-profile-title'>Editar nome</h1>
                <input autoFocus aria-label='Nome da vaca' value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} />
                <div>
                  <button type='submit' className='ui-button ui-button-primary' disabled={!canSaveName || savingName}>
                    {savingName ? 'Salvando…' : 'Salvar nome'}
                  </button>
                  <button type='button' className='ui-button' onClick={() => { setIsEditingName(false); setNameDraft(cow.name) }}>
                    Cancelar
                  </button>
                </div>
              </form>
            ) : <h1 id='cow-profile-title'>{cow.name}</h1>}
            {(tag || breed || cow.status) && (
              <ul className='cow-meta' aria-label='Identificação da vaca'>
                {tag && <li>Brinco {tag}</li>}
                {breed && <li>{breed}</li>}
                {cow.status && <li>{cow.status}</li>}
              </ul>
            )}
            <dl className='cow-profile-metrics'>
              <div>
                <dt>Partos registrados</dt>
                <dd>{events.length}</dd>
              </div>
              <div>
                <dt>Último parto</dt>
                <dd>{lastEvent ? formatDateBR(lastEvent.date) : '—'}</dd>
                {lastEvent && <dd className='cow-metric-note'>{formatTimeSince(lastEvent.date)}</dd>}
              </div>
            </dl>
            <button type='button' onClick={onNewCalving} className='ui-button ui-button-primary cow-register'>
              <Plus size={19} aria-hidden='true' /> Registrar parto
            </button>
          </div>
        </div>

        <section className='birth-history' aria-labelledby='birth-history-title'>
          <h2 id='birth-history-title'>Histórico de partos</h2>
          {events.length ? (
            <ol className='birth-list'>
              {events.map((event) => (
                <BirthItemRow
                  key={event.id}
                  event={event}
                  photos={getEventPhotos(event)}
                  onOpen={() => setGalleryEvent(event)}
                  onOpenMenu={() => setActiveEventMenu(event)}
                />
              ))}
            </ol>
          ) : (
            <div className='herd-empty'>
              <span className='herd-metric-icon'><AnimalIcon src={calfIcon} /></span>
              <strong>Nenhum parto registrado</strong>
            </div>
          )}
        </section>
      </section>

      <CalvingGalleryModal
        open={Boolean(galleryEvent)}
        event={galleryEvent}
        cowName={cow?.name || 'Vaca'}
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
            <ImageIcon size={16} />
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
          role='status'
          className='repro-toast fixed left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full border text-sm font-semibold shadow-lg'
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
  const touchStartX = React.useRef(0)

  const photos = getEventPhotos(event)
  const hasPhotos = photos.length > 0

  React.useEffect(() => {
    if (!open) setIsPickerOpen(false)
  }, [open])

  React.useEffect(() => {
    setActiveIndex(0)
  }, [event?.id])

  React.useEffect(() => {
    if (!open || photos.length < 2) return
    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'ArrowLeft') setActiveIndex(current => (current - 1 + photos.length) % photos.length)
      if (keyboardEvent.key === 'ArrowRight') setActiveIndex(current => (current + 1) % photos.length)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, photos.length])

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
      <Modal
        open={open}
        title='Fotos do parto'
        size='fullscreen'
        onClose={onClose}
        closeLabel={<X size={14} />}
        closeAriaLabel='Fechar'
        closeOnBackdrop
      >
        <div className='photo-gallery-shell'>
          <div className='photo-gallery-toolbar'>
            <div className='min-w-0'>
              <p className='text-sm font-semibold truncate'>{cowName}</p>
              <p className='mt-1 text-xs' style={{color:'var(--muted)'}}>{formatDateBR(event.date)}{event.sex ? ` · ${sexLabel(event.sex)}` : ''} · {formatTimeSince(event.date)}</p>
            </div>
            <div className='flex gap-2 flex-wrap justify-end'>
              {hasPhotos ? (
                <button
                  type='button'
                  onClick={handleRemove}
                  className='h-9 px-3 rounded-full text-xs font-semibold border transition hover:brightness-110 disabled:opacity-60'
                  style={{ background: 'rgba(255, 90, 106, 0.14)', borderColor: 'var(--border)', color: 'var(--danger)' }}
                  disabled={!hasPhotos}
                >
                  Remover foto
                </button>
              ) : null}
              <button
                type='button'
                onClick={() => setIsPickerOpen(true)}
                className='h-9 px-4 rounded-full text-xs font-semibold border transition hover:brightness-110 inline-flex items-center gap-2'
                style={{ background: 'var(--accent, var(--primary, #087f68))', borderColor: 'transparent', color: 'var(--accent-ink)' }}
              >
                <Plus size={14} />
                Adicionar foto
              </button>
            </div>
          </div>

          {hasPhotos ? (
            <div className='space-y-3'>
              <div
                className='photo-gallery-frame'
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
              >
              <div className='photo-gallery-count'>
                  {`${activeIndex + 1}/${photos.length}`}
                </div>
                <div className='photo-gallery-stage'>
                  <img
                    src={photos[activeIndex]}
                    alt={`Foto ${activeIndex + 1} de ${photos.length} do parto de ${cowName}`}
                    className='photo-gallery-image'
                    onTouchStart={touchEvent => { touchStartX.current = touchEvent.touches[0]?.clientX ?? 0 }}
                    onTouchEnd={touchEvent => {
                      const delta = (touchEvent.changedTouches[0]?.clientX ?? 0) - touchStartX.current
                      if (Math.abs(delta) > 45) delta < 0 ? goNext() : goPrev()
                    }}
                  />
                </div>
                {photos.length > 1 ? (
                  <div className='absolute inset-y-0 left-0 right-0 flex items-center justify-between px-3 pointer-events-none'>
                    <button
                      type='button'
                      onClick={goPrev}
                      className='photo-gallery-arrow'
                      aria-label='Foto anterior'
                    >
                      <ChevronLeft size={22}/>
                    </button>
                    <button
                      type='button'
                      onClick={goNext}
                      className='photo-gallery-arrow'
                      aria-label='Próxima foto'
                    >
                      <ChevronRight size={22}/>
                    </button>
                  </div>
                ) : null}
              </div>
              {photos.length > 1 && <div className='photo-gallery-thumbnails' aria-label='Selecionar foto'>
                {photos.map((photo,index)=><button key={`${event.id}-${index}`} type='button' aria-label={`Abrir foto ${index+1}`} aria-pressed={activeIndex===index} onClick={()=>setActiveIndex(index)} className={`photo-gallery-thumbnail ${activeIndex===index?'is-active':''}`}><img src={photo} alt=''/></button>)}
              </div>}
              <p className='photo-gallery-hint'>{photos.length > 1 ? 'Deslize para navegar ou escolha uma miniatura' : 'Foto em tamanho ampliado'}</p>
            </div>
          ) : (
            <div
              className='rounded-xl border px-4 py-8 text-center space-y-2'
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--muted)' }}
            >
              <div className='text-sm font-semibold' style={{ color: 'var(--text)' }}>
                Nenhuma foto adicionada ainda
              </div>
              <div className='text-xs'>
                Adicione fotos do parto para manter o historico completo.
              </div>
              <button
                type='button'
                onClick={() => setIsPickerOpen(true)}
                className='h-10 px-4 rounded-full text-sm font-semibold border transition hover:brightness-110 inline-flex items-center gap-2 justify-center'
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <Plus size={14} />
                Adicionar foto
              </button>
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
            <ImageIcon size={16} />
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
      className='fixed inset-0 z-[90] flex items-end justify-center px-4 pb-6'
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
        className='cow-photo-lightbox'
        onClick={onClose}
      >
        <div className='cow-photo-lightbox-shell' onClick={(e) => e.stopPropagation()}>
          <div className='cow-photo-lightbox-toolbar'>
            <div className='min-w-0 truncate text-sm font-semibold text-white'>
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
            className='cow-photo-lightbox-stage'
            onWheel={(e) => {
              if (!e.ctrlKey) return
              e.preventDefault()
              adjustZoom(e.deltaY > 0 ? -0.1 : 0.1)
            }}
          >
            <img
              src={src}
              alt={title}
              className='cow-photo-lightbox-image'
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            />
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
                <ImageIcon size={16} />
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
  const [saveError, setSaveError] = useState('')
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

    setSaveError('')
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
    setMode(cows.length ? 'existing' : 'new')
    setSelectedCowId(initialCowId || cows[0]?.id || '')
  }, [open, editing?.id, initialCowId])

  const isTodaySelected = date === todayValue
  const isYesterdaySelected = date === yesterdayValue

  const title = editing ? 'Editar parto' : 'Novo parto'
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
    setSaveError('')
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
      setSaveError('Não foi possível salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const primaryLabel = editing ? 'Salvar alterações' : 'Registrar parto'

  return (
    <>
      <Modal
        open={open}
        title={title}
        size='wide'
        onClose={onClose}
        closeOnBackdrop
        closeLabel={<X size={14} />}
        closeAriaLabel='Fechar'
      >
        <form className='calving-form' onSubmit={(event) => {
          event.preventDefault()
          if (!saving) void save()
        }}>
          {saveError && <p role='alert' className='calving-error'>{saveError}</p>}

          <section className='calving-fieldset' aria-labelledby='calving-cow-title'>
            <div className='calving-field-heading'>
              <h3 id='calving-cow-title'>Vaca</h3>
              {!editing && cows.length > 0 && (
                <button
                  type='button'
                  className='ui-button'
                  onClick={() => {
                    if (mode === 'existing') {
                      setMode('new')
                      setNewCowName('')
                    } else {
                      setMode('existing')
                    }
                  }}
                >
                  {mode === 'new' ? 'Vaca cadastrada' : <><Plus size={16} aria-hidden='true' /> Nova vaca</>}
                </button>
              )}
            </div>
            {editing ? (
              <p className='calving-cow-name'>{cows.find((cow) => cow.id === editing.cowId)?.name || 'Vaca'}</p>
            ) : mode === 'existing' ? (
              <select aria-label='Vaca cadastrada' required value={selectedCowId} onChange={(event) => setSelectedCowId(event.target.value)}>
                <option value='' disabled>Selecione uma vaca</option>
                {cows.map((cow) => <option key={cow.id} value={cow.id}>{cow.name}</option>)}
              </select>
            ) : (
              <input aria-label='Nome da nova vaca' required value={newCowName} onChange={(event) => setNewCowName(event.target.value)} placeholder='Nome da nova vaca' />
            )}
          </section>

          <section className='calving-fieldset' aria-labelledby='calving-date-title'>
            <div className='calving-field-heading'>
              <label id='calving-date-title' htmlFor='calving-date'>Data do parto</label>
              <div className='calving-choice' role='group' aria-label='Atalhos de data'>
                <button type='button' className='ui-button' aria-pressed={isTodaySelected} onClick={() => setQuickDate(0)}>Hoje</button>
                <button type='button' className='ui-button' aria-pressed={isYesterdaySelected} onClick={() => setQuickDate(1)}>Ontem</button>
              </div>
            </div>
            <input id='calving-date' type='date' required value={date} onChange={(event) => setDate(event.target.value)} />

            <div className='calving-choice calving-sex' role='group' aria-label='Sexo do bezerro'>
              <button type='button' className='ui-button' aria-pressed={sex === 'MACHO'} onClick={() => setSex('MACHO')}>
                {sex === 'MACHO' ? <CircleDot size={16} /> : <Circle size={16} />} Macho
              </button>
              <button type='button' className='ui-button' aria-pressed={sex === 'FEMEA'} onClick={() => setSex('FEMEA')}>
                {sex === 'FEMEA' ? <CircleDot size={16} /> : <Circle size={16} />} Fêmea
              </button>
            </div>
          </section>

          <section className='calving-fieldset' aria-labelledby='calving-photo-title'>
            <div className='calving-field-heading'>
              <h3 id='calving-photo-title'>Foto</h3>
              <span>{photos.length ? photos.length + (photos.length === 1 ? ' foto' : ' fotos') : 'Opcional'}</span>
            </div>
            {primaryPhoto ? (
              <div className='calving-preview'>
                <img src={primaryPhoto} alt='Prévia da foto do parto' />
                <div className='calving-choice'>
                  <button type='button' className='ui-button' onClick={() => setIsPhotoPickerOpen(true)}>Trocar foto</button>
                  <button type='button' className='ui-button' onClick={() => setPhotos((previous) => previous.slice(1))}>Remover foto</button>
                </div>
              </div>
            ) : (
              <button type='button' className='ui-button calving-add-photo' onClick={() => setIsPhotoPickerOpen(true)}>
                <Camera size={19} aria-hidden='true' /> Adicionar foto
              </button>
            )}
          </section>

          <div className='calving-form-actions'>
            <button type='button' className='ui-button' onClick={onClose}>Cancelar</button>
            <button type='submit' className='ui-button ui-button-primary' disabled={!canSave || saving}>
              {saving ? 'Salvando…' : primaryLabel}
            </button>
          </div>
        </form>
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
            <ImageIcon size={16} />
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
  const [saveError, setSaveError] = useState('')

  React.useEffect(() => {
    if (open) { setName(''); setSaveError('') }
  }, [open])

  const canSave = Boolean(name.trim())

  const save = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) return
    setSaveError('')
    setSaving(true)
    try {
      const newCow: Cow = { id: crypto.randomUUID(), name: trimmedName }
      await offlineWrites.saveCow(newCow)
      onSaved(newCow)
    } catch (e) {
      console.error('Falha ao salvar vaca', e)
      setSaveError('Não foi possível salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title='Nova vaca' onClose={onClose} closeOnBackdrop>
      {saveError && <p role='alert' className='text-sm text-red-700'>{saveError}</p>}
      <div className='space-y-4'>
        <div className='space-y-2'>
          <div className='text-xs font-semibold' style={{ color: 'var(--muted)' }}>
            <label htmlFor='new-cow-name'>Nome da vaca</label>
          </div>
          <input
            id='new-cow-name'
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
              background: 'var(--accent, var(--primary, #087f68))',
              borderColor: 'transparent',
              color: 'var(--accent-ink)'
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




















