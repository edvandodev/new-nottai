import React, { useMemo, useState } from 'react'
import { CalendarDays, Edit3, ImagePlus, Milk, MoreVertical, Plus, Search, X } from 'lucide-react'

import type { CalvingEvent, CalvingSex, Cow } from '@/types'
import { Modal } from '@/components/Modal'
import { StatCard } from '@/components/payments/StatCard'
import { offlineWrites } from '@/services/offlineWrites'
import '../../styles/theme-flat.css'

type ReproductionPageProps = {
  cows: Cow[]
  calvings: CalvingEvent[]
}

const cowCardColors = {
  accent: '#b9ff45',
  background: 'rgba(185, 255, 69, 0.12)',
  border: 'rgba(185, 255, 69, 0.32)'
}

const birthsCardColors = {
  accent: '#35e6b5',
  background: 'rgba(53, 230, 181, 0.12)',
  border: 'rgba(53, 230, 181, 0.32)'
}

type HeadIconProps = {
  size?: number
  color?: string
}

const CalfHeadIcon = ({ size = 56, color = 'var(--muted)' }: HeadIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 72 72'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    stroke={color}
    strokeWidth='2.6'
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden
    focusable='false'
  >
    <path d='M36 13.5c-3.6 0-6.8 1.2-9.6 3.6l-7.2-3c-4.8-2-9.9 1.8-9.9 7.2 0 4.6 2.9 8.6 7.3 10l-.2 2.2c0 5.9 2 11.8 5.8 16.3 3.2 3.9 7.7 6.2 12.8 6.2s9.6-2.3 12.8-6.2c3.8-4.5 5.8-10.4 5.8-16.3l-.2-2.2c4.4-1.4 7.3-5.4 7.3-10 0-5.4-5.1-9.2-9.9-7.2l-7.2 3C42.8 14.7 39.6 13.5 36 13.5Z' />
    <circle cx='27.5' cy='35' r='1.4' />
    <circle cx='44.5' cy='35' r='1.4' />
    <path d='M30 40.5c1.7 1.2 3.6 1.8 6 1.8s4.3-.6 6-1.8' />
    <path d='M32.5 44.5c2.1 2.2 4.9 2.2 7 0' />
  </svg>
)

const CowHeadIcon = ({ size = 56, color = 'var(--muted)' }: HeadIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 72 72'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    stroke={color}
    strokeWidth='2.6'
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden
    focusable='false'
  >
    <path d='M19 18.5c-1.2-4-4.4-7.5-8.7-9L5 7.7C4.7 12.7 7 18 11.6 21' />
    <path d='M53 18.5c1.2-4 4.4-7.5 8.7-9l5.3-1.8c.3 5-2 10.3-6.6 13.3' />
    <path d='M36 13.5c-3.6 0-6.8 1.2-9.6 3.6l-7.2-3c-4.8-2-9.9 1.8-9.9 7.2 0 4.6 2.9 8.6 7.3 10l-.2 2.2c0 5.9 2 11.8 5.8 16.3 3.2 3.9 7.7 6.2 12.8 6.2s9.6-2.3 12.8-6.2c3.8-4.5 5.8-10.4 5.8-16.3l-.2-2.2c4.4-1.4 7.3-5.4 7.3-10 0-5.4-5.1-9.2-9.9-7.2l-7.2 3C42.8 14.7 39.6 13.5 36 13.5Z' />
    <circle cx='27.5' cy='35' r='1.4' />
    <circle cx='44.5' cy='35' r='1.4' />
    <path d='M30 40.5c1.7 1.2 3.6 1.8 6 1.8s4.3-.6 6-1.8' />
    <path d='M32.5 44.5c2.1 2.2 4.9 2.2 7 0' />
  </svg>
)

const formatDateBR = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('pt-BR')
}

const daysSince = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const diffMs = Date.now() - d.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

const plural = (n: number, singular: string, pluralForm: string) =>
  n === 1 ? singular : pluralForm

const formatElapsed = (days: number) => {
  if (days <= 30) {
    return `Há ${days} ${plural(days, 'dia', 'dias')}`
  }

  if (days < 360) {
    const months = Math.floor(days / 30)
    const remainingDays = days % 30
    if (remainingDays === 0) {
      return `Há ${months} ${plural(months, 'mês', 'meses')}`
    }
    return `Há ${months} ${plural(months, 'mês', 'meses')} e ${remainingDays} ${plural(remainingDays, 'dia', 'dias')}`
  }

  const years = Math.floor(days / 360)
  const rest = days % 360
  const months = Math.floor(rest / 30)
  const remainingDays = rest % 30
  const parts: string[] = [`Há ${years} ${plural(years, 'ano', 'anos')}`]
  if (months > 0) parts.push(`${months} ${plural(months, 'mês', 'meses')}`)
  if (remainingDays > 0) parts.push(`${remainingDays} ${plural(remainingDays, 'dia', 'dias')}`)
  return parts.join(' e ')
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
  await loaded

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

  ctx.drawImage(img, 0, 0, targetW, targetH)

  // JPEG costuma ficar bem menor e é o esperado para foto.
  try {
    return canvas.toDataURL('image/jpeg', quality)
  } catch {
    return dataUrl
  }
}


const sexLabel = (sex: CalvingSex) => (sex === 'MACHO' ? 'Macho' : 'Fêmea')

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

    return calvings.reduce((count, calving) => {
      const time = new Date(calving.date).getTime()
      if (Number.isNaN(time)) return count
      return time >= cutoff ? count + 1 : count
    }, 0)
  }, [calvings])

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
      <div
        className='rounded-2xl p-4 border'
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className='flex items-center justify-between gap-3'>
          <div className='flex items-center gap-2'>
            <div
              className='h-10 w-10 rounded-xl flex items-center justify-center border'
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
            >
              <CalendarDays size={18} style={{ color: 'var(--muted)' }} />
            </div>
            <div>
              <div className='text-sm font-semibold' style={{ color: 'var(--text)' }}>
                Reprodução</div>
              <div className='text-xs' style={{ color: 'var(--muted)' }}>
                Anote partos por vaca, com data, sexo e foto.
              </div>
            </div>
          </div>

          <button
            type='button'
            onClick={() => {
              setEditingCalving(null)
              setIsNewMenuOpen(true)
            }}
            className='inline-flex items-center gap-2 px-3 h-10 rounded-xl border text-sm font-semibold transition hover:brightness-110'
            style={{
              background: 'var(--accent, var(--primary, #b8ff2c))',
              borderColor: 'transparent',
              color: 'var(--accentText, #07110a)'
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
            placeholder='Buscar vaca pelo nome...'
            className='w-full h-11 pl-10 pr-3 rounded-xl border outline-none'
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          />
        </div>

        <div className='mt-4 grid grid-cols-2 gap-3'>
          <StatCard
            label='Total de Vacas'
            value={String(cows.length)}
            variant='tinted'
            accentColor={cowCardColors.accent}
            backgroundTintColor={cowCardColors.background}
            borderColor={cowCardColors.border}
            icon={<Milk size={20} color={cowCardColors.accent} />}
          />
          <StatCard
            label='Partos (30 dias)'
            value={String(calvingsLast30Days)}
            variant='tinted'
            accentColor={birthsCardColors.accent}
            backgroundTintColor={birthsCardColors.background}
            borderColor={birthsCardColors.border}
            icon={<CalendarDays size={20} color={birthsCardColors.accent} />}
          />
        </div>
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
            const daysSinceLast = lastEvent ? daysSince(lastEvent.date) : null
            const elapsedLabel = daysSinceLast !== null ? formatElapsed(daysSinceLast) : null

            return (
              <button
                key={r.cow.id}
                type="button"
                onClick={() => openCow(r.cow)}
                className="w-full text-left rounded-2xl p-4 border transition hover:brightness-110"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
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
                    className="h-10 w-10 rounded-xl border flex items-center justify-center"
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

      <Modal
        open={isNewMenuOpen}
        title='Novo'
        onClose={() => setIsNewMenuOpen(false)}
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
            <div className='flex flex-col items-center gap-3'>
              <CalfHeadIcon />
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
            <div className='flex flex-col items-center gap-3'>
              <CowHeadIcon />
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
  const [name, setName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [deletingCow, setDeletingCow] = useState(false)
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [photoViewer, setPhotoViewer] = useState<{
    src: string | null
    title: string
    event?: CalvingEvent
  }>({
    src: null,
    title: ''
  })

  React.useEffect(() => {
    setName(cow?.name || '')
  }, [cow?.id, cow?.name])

  const canSaveName = cow && name.trim() && name.trim() !== cow.name

  const saveName = async () => {
    if (!cow) return
    const nextName = name.trim()
    if (!nextName) return
    setSavingName(true)
    try {
      await offlineWrites.saveCow({ ...cow, name: nextName })
    } catch (e) {
      console.error('Falha ao salvar nome da vaca', e)
      alert('Não foi possível salvar. Tente novamente.')
    } finally {
      setSavingName(false)
    }
  }

  const handleDeleteCow = async () => {
    if (!cow) return
    setDeletingCow(true)
    try {
      await offlineWrites.deleteCow(cow.id)
      onClose()
    } catch (e) {
      console.error('Falha ao apagar vaca', e)
      alert('Nao foi possivel apagar. Tente novamente.')
    } finally {
      setDeletingCow(false)
    }
  }

  const openPhotoViewer = (src: string, title: string, event?: CalvingEvent) => {
    setPhotoViewer({ src, title, event })
  }

  const closePhotoViewer = () => {
    setPhotoViewer({ src: null, title: '', event: undefined })
  }

  const updateEventPhoto = async (event: CalvingEvent, nextPhoto: string | null) => {
    try {
      await offlineWrites.saveCalving({ ...event, photoDataUrl: nextPhoto })
    } catch (e) {
      console.error('Falha ao atualizar foto do parto', e)
      alert('Nao foi possivel atualizar a foto. Tente novamente.')
    }
  }

  const handleReplacePhotoFromViewer = async (file?: File | null) => {
    if (!file || !photoViewer.src || !photoViewer.event) return
    const raw = await readFileAsDataUrl(file)
    const compressed = await compressImageDataUrl(raw, { maxDim: 1024, quality: 0.78 })
    await updateEventPhoto(photoViewer.event, compressed)
    setPhotoViewer((prev) => ({ ...prev, src: compressed }))
  }

  const handleRemovePhotoFromViewer = async () => {
    if (!photoViewer.event?.photoDataUrl) return
    const confirmRemove = window.confirm('Remover a foto deste parto?')
    if (!confirmRemove) return
    await updateEventPhoto(photoViewer.event, null)
    closePhotoViewer()
  }

  const openDeleteFlow = () => {
    setDeleteInput('')
    setIsActionsOpen(false)
    setIsDeleteConfirmOpen(true)
  }

  const handleArchiveCow = () => {
    alert('TODO: Arquivar vaca ainda nao implementado.')
    setIsActionsOpen(false)
  }

  const canDelete = cow && deleteInput.trim() === cow.name.trim()

  const confirmDeleteCow = async () => {
    if (!cow || !canDelete) return
    await handleDeleteCow()
    setIsDeleteConfirmOpen(false)
  }

  return (
    <>
      <Modal
        open={open}
        title={cow ? cow.name : 'Vaca'}
        onClose={onClose}
        closeLabel={<X size={14} />}
        closeAriaLabel='Fechar'
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
        <div className='text-sm' style={{ color: 'var(--muted)' }}>
          Nenhuma vaca selecionada.
        </div>
      ) : (
        <div className='space-y-4'>
          <div className='space-y-2'>
            <div className='text-xs font-semibold' style={{ color: 'var(--muted)' }}>
              Nome da vaca (editar)
            </div>
            <div
              className='flex items-center gap-1 rounded-full border p-1'
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className='flex-1 h-11 rounded-xl border px-3 outline-none'
                style={{
                  background: 'var(--surface-2)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
              />
              <button
                type='button'
                disabled={!canSaveName || savingName}
                onClick={saveName}
                className='h-11 px-4 rounded-xl text-sm font-semibold border transition disabled:opacity-60'
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
              >
                {savingName ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
  
          <div className='flex items-center justify-between'>
            <div className='text-sm font-semibold' style={{ color: 'var(--text)' }}>
              Historico de partos
            </div>
            <button
              type='button'
              onClick={onNewCalving}
              className='inline-flex items-center gap-2 h-9 px-3 rounded-xl text-sm font-semibold border transition hover:brightness-110'
              style={{
                background: 'var(--accent, var(--primary, #b8ff2c))',
                borderColor: 'transparent',
                color: 'var(--accentText, #07110a)'
              }}
            >
              <Plus size={14} />
              Novo
            </button>
          </div>

          {events.length === 0 ? (
            <div
              className='rounded-2xl p-4 border text-sm'
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--muted)' }}
            >
              Ainda nao ha partos registrados para essa vaca.
            </div>
          ) : (
            <div className='space-y-2'>
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className='rounded-2xl p-3 border flex items-center justify-between gap-3'
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
                >
                  <div className='flex items-center gap-3'>
                    <div
                      className='h-12 w-12 rounded-xl border overflow-hidden flex items-center justify-center'
                      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                    >
                      {ev.photoDataUrl ? (
                        <button
                          type='button'
                          onClick={() => openPhotoViewer(ev.photoDataUrl as string, `Parto ${formatDateBR(ev.date)}`, ev)}
                          className='h-full w-full'
                          style={{ display: 'block' }}
                        >
                          <img
                            src={ev.photoDataUrl}
                            alt='Foto do parto'
                            className='h-full w-full object-cover'
                          />
                        </button>
                      ) : (
                        <span className='text-[10px] font-semibold' style={{ color: 'var(--muted)' }}>
                          {sexLabel(ev.sex)}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className='text-sm font-semibold' style={{ color: 'var(--text)' }}>
                        {formatDateBR(ev.date)}
                      </div>
                      <div className='text-xs' style={{ color: 'var(--muted)' }}>
                        {sexLabel(ev.sex)}
                      </div>
                    </div>
                  </div>
                  <button
                    type='button'
                    onClick={() => onEditCalving(ev)}
                    className='h-9 w-9 rounded-xl border flex items-center justify-center transition hover:brightness-110'
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    <Edit3 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </Modal>

      <ActionSheet open={isActionsOpen} onClose={() => setIsActionsOpen(false)}>
        <div className='flex flex-col'>
          <button
            type='button'
            onClick={handleArchiveCow}
            className='w-full text-left px-3 py-3 rounded-xl transition hover:brightness-110'
            style={{ color: 'var(--text)' }}
          >
            Arquivar vaca
          </button>
          <button
            type='button'
            onClick={openDeleteFlow}
            className='w-full text-left px-3 py-3 rounded-xl transition hover:brightness-110'
            style={{ color: 'var(--danger)' }}
          >
            Apagar vaca...
          </button>
        </div>
      </ActionSheet>

      <Modal
        open={isDeleteConfirmOpen}
        title={cow ? `Apagar ${cow.name}?` : 'Apagar vaca?'}
        onClose={() => setIsDeleteConfirmOpen(false)}
        closeLabel={<X size={14} />}
        closeAriaLabel='Fechar'
      >
        <div className='space-y-3'>
          <div className='text-sm' style={{ color: 'var(--muted)' }}>
            Essa acao remove a vaca e o historico de partos. Nao pode ser desfeita.
          </div>
          <div className='space-y-2'>
            <div className='text-xs font-semibold' style={{ color: 'var(--muted)' }}>
              Digite o nome da vaca para confirmar
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
              {deletingCow ? 'Apagando...' : 'Apagar definitivamente'}
            </button>
          </div>
        </div>
      </Modal>

      <ImageViewerModal
        open={Boolean(photoViewer.src)}
        src={photoViewer.src}
        title={photoViewer.title}
        onClose={closePhotoViewer}
        onReplace={photoViewer.event ? handleReplacePhotoFromViewer : undefined}
        onRemove={photoViewer.event ? handleRemovePhotoFromViewer : undefined}
        canRemove={Boolean(photoViewer.event?.photoDataUrl)}
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
  if (!open || !src) return null
  return (
    <div
      className='fixed inset-0 z-50 flex flex-col'
      style={{ background: 'rgba(0, 0, 0, 0.85)' }}
    >
      <div className='flex items-center justify-between gap-2 p-4'>
        <div className='text-sm font-semibold' style={{ color: 'var(--text)' }}>
          {title}
        </div>
        <div className='flex items-center gap-2'>
          {onReplace && (
            <label
              className='h-10 px-3 rounded-xl text-sm font-semibold border inline-flex items-center gap-2 cursor-pointer transition hover:brightness-110'
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
            >
              Trocar
              <input
                type='file'
                accept='image/*'
                capture='environment'
                className='hidden'
                onChange={(e) => onReplace(e.target.files?.[0])}
              />
            </label>
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
      <div className='flex-1 flex items-center justify-center p-4'>
        <img
          src={src}
          alt={title}
          className='max-h-full max-w-full object-contain rounded-2xl border'
          style={{ borderColor: 'var(--border)' }}
        />
      </div>
    </div>
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
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState(false)

  React.useEffect(() => {
    if (!open) return

    // Reset
    if (editing) {
      setMode('existing')
      setSelectedCowId(editing.cowId)
      setNewCowName('')
      setSex(editing.sex)
      setPhotoDataUrl(editing.photoDataUrl)
      const d = new Date(editing.date)
      if (!Number.isNaN(d.getTime())) {
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        setDate(`${yyyy}-${mm}-${dd}`)
      } else {
        setDate('')
      }
      return
    }

    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    setDate(`${yyyy}-${mm}-${dd}`)
    setSex('FEMEA')
    setPhotoDataUrl(undefined)
    setNewCowName('')

    if (initialCowId) {
      setMode('existing')
      setSelectedCowId(initialCowId)
    } else {
      setMode('existing')
      setSelectedCowId(cows[0]?.id || '')
    }
  }, [open, editing?.id, initialCowId, cows])

  const title = editing ? 'Editar parto' : 'Cadastrar novo parto'

  const handlePickPhoto = async (file?: File | null) => {
    if (!file) return
    try {
      const raw = await readFileAsDataUrl(file)
      const compressed = await compressImageDataUrl(raw, { maxDim: 1024, quality: 0.78 })
      setPhotoDataUrl(compressed)
    } catch (e) {
      console.error('Falha ao preparar imagem', e)
      alert('Não foi possível carregar a imagem.')
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
      const ev: CalvingEvent = {
        ...(editing || {}),
        id: evId,
        cowId,
        date: toDateTime(date),
        sex,
        photoDataUrl: photoDataUrl ?? null
      }
      await offlineWrites.saveCalving(ev)
      onSaved()
    } catch (e) {
      console.error('Falha ao salvar parto', e)
      alert('Não foi possível salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className='space-y-4'>
        {!editing && (
          <div className='space-y-2'>
            <div className='text-xs font-semibold' style={{ color: 'var(--muted)' }}>
              Vaca
            </div>
            <div
              className='flex items-center gap-1 rounded-full border p-1'
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
            >
              <button
                type='button'
                onClick={() => setMode('existing')}
                className='h-10 px-3 rounded-xl text-sm font-semibold border transition'
                style={{
                  background: mode === 'existing' ? 'var(--surface)' : 'var(--surface-2)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
              >
                Selecionar
              </button>
              <button
                type='button'
                onClick={() => setMode('new')}
                className='h-10 px-3 rounded-xl text-sm font-semibold border transition'
                style={{
                  background: mode === 'new' ? 'var(--surface)' : 'var(--surface-2)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
              >
                Nova vaca
              </button>
            </div>

            {mode === 'existing' ? (
              <select
                value={selectedCowId}
                onChange={(e) => setSelectedCowId(e.target.value)}
                className='w-full h-11 rounded-xl border px-3 outline-none'
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
            ) : (
              <input
                value={newCowName}
                onChange={(e) => setNewCowName(e.target.value)}
                placeholder='Nome da vaca...'
                className='w-full h-11 rounded-xl border px-3 outline-none'
                style={{
                  background: 'var(--surface-2)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
              />
            )}
          </div>
        )}

        {editing && (
          <div className='text-xs' style={{ color: 'var(--muted)' }}>
            Vaca do registro: <b>{cows.find((c) => c.id === editing.cowId)?.name || 'Vaca'}</b>
          </div>
        )}

        <div className='grid grid-cols-2 gap-3'>
          <div className='space-y-2'>
            <div className='text-xs font-semibold' style={{ color: 'var(--muted)' }}>
              Data
            </div>
            <input
              type='date'
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className='w-full h-11 rounded-xl border px-3 outline-none'
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
            />
          </div>

          <div className='space-y-2'>
            <div className='text-xs font-semibold' style={{ color: 'var(--muted)' }}>
              Sexo
            </div>
            <div
              className='flex items-center gap-1 rounded-full border p-1'
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
            >
              <button
                type='button'
                onClick={() => setSex('MACHO')}
                className='flex-1 h-10 rounded-full text-sm font-semibold transition'
                style={{
                  background: sex === 'MACHO' ? 'var(--accent, var(--primary, #b8ff2c))' : 'transparent',
                  color: sex === 'MACHO' ? 'var(--accentText, #07110a)' : 'var(--muted)',
                  boxShadow: sex === 'MACHO' ? '0 8px 24px -14px var(--shadow)' : 'none'
                }}
              >
                Macho
              </button>
              <button
                type='button'
                onClick={() => setSex('FEMEA')}
                className='flex-1 h-10 rounded-full text-sm font-semibold transition'
                style={{
                  background: sex === 'FEMEA' ? 'var(--accent, var(--primary, #b8ff2c))' : 'transparent',
                  color: sex === 'FEMEA' ? 'var(--accentText, #07110a)' : 'var(--muted)',
                  boxShadow: sex === 'FEMEA' ? '0 8px 24px -14px var(--shadow)' : 'none'
                }}
              >
                Fêmea
              </button>
            </div>
          </div>
        </div>

        <div className='space-y-2'>
          <div className='text-xs font-semibold' style={{ color: 'var(--muted)' }}>
            Foto (opcional)
          </div>

          <div className='flex items-center gap-3'>
            <label
              className='h-11 px-4 rounded-xl text-sm font-semibold border inline-flex items-center gap-2 cursor-pointer transition hover:brightness-110'
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
            >
              <ImagePlus size={16} />
              Selecionar foto
              <input
                type='file'
                accept='image/*'
                capture='environment'
                className='hidden'
                onChange={(e) => handlePickPhoto(e.target.files?.[0])}
              />
            </label>

            {photoDataUrl && (
              <button
                type='button'
                onClick={() => setPhotoDataUrl(undefined)}
                className='h-11 px-4 rounded-xl text-sm font-semibold border transition hover:brightness-110'
                style={{
                  background: 'var(--surface-2)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
              >
                Remover
              </button>
            )}
          </div>

          {photoDataUrl && (
            <div
              className='rounded-2xl border overflow-hidden'
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
            >
              <img src={photoDataUrl} alt='Preview da foto' className='w-full h-48 object-cover' />
            </div>
          )}
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
      alert('Não foi possível salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title='Nova vaca' onClose={onClose}>
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















