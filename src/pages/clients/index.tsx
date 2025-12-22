import React, { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  AlertTriangle,
  MessageCircle,
  Pencil,
  Plus,
  ChevronDown,
  ChevronUp,
  Search,
  ShoppingCart,
  Trash2,
  User as UserIcon,
  Users,
  Wallet,
  X
} from 'lucide-react'
import type { Client, Payment, PriceSettings, Sale } from '@/types'
import { ClientActionBarInline } from '@/components/ClientActionBarInline'
import '../../styles/theme-flat.css'

type ClientsPageProps = {
  clients: Client[]
  sales: Sale[]
  payments: Payment[]
  clientBalances: Map<string, number>
  priceSettings: PriceSettings
  resetToListSignal?: number
  onAddClient: () => void
  onEditClient: (client: Client) => void
  onAddSale: (clientId: string) => void
  onPayDebt: (clientId: string) => void
  onGenerateNote: (clientId: string) => void
  onDeleteClient: (clientId: string) => void
  onDeleteSale: (saleId: string) => void
  onDeletePayment: (paymentId: string) => void
  onDetailsViewChange: (isDetails: boolean) => void
}

type HistoryEvent = {
  id: string
  type: 'sale' | 'payment'
  amount: number
  createdAt:
    | string
    | number
    | Date
    | { seconds?: number; nanoseconds?: number; toMillis?: () => number }
  liters?: number
}

type DayGroup = {
  key: string
  label: string
  items: HistoryEvent[]
}

type ClientFilter = 'ALL' | 'BALANCE' | 'ZERO' | 'AZ'
type HistoryFilter = 'ALL' | 'PAYMENTS' | 'SALES'

const TYPE_PRIORITY: Record<HistoryEvent['type'], number> = {
  payment: 2,
  sale: 1
}

const normalizeTimestamp = (
  value: HistoryEvent['createdAt'] | null | undefined
): number => {
  if (!value) return 0

  if (value instanceof Date) return value.getTime()

  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const t = new Date(value).getTime()
    return Number.isNaN(t) ? 0 : t
  }

  if (typeof value === 'object') {
    if (typeof value.toMillis === 'function') {
      const t = value.toMillis()
      return Number.isNaN(t) ? 0 : t
    }
    if (typeof value.seconds === 'number') {
      const millis =
        value.seconds * 1000 +
        (typeof value.nanoseconds === 'number'
          ? Math.floor(value.nanoseconds / 1_000_000)
          : 0)
      return millis
    }
  }

  const fallback = new Date(value as any).getTime()
  return Number.isNaN(fallback) ? 0 : fallback
}

const sortHistoryEvents = (events: HistoryEvent[]) => {
  return [...events].sort((a, b) => {
    const tsA = normalizeTimestamp(a.createdAt)
    const tsB = normalizeTimestamp(b.createdAt)

    if (tsA !== tsB) return tsB - tsA

    const prioA = TYPE_PRIORITY[a.type] || 0
    const prioB = TYPE_PRIORITY[b.type] || 0
    if (prioA !== prioB) return prioB - prioA

    return String(a.id).localeCompare(String(b.id))
  })
}

const getDayKey = (ts: number) => {
  const d = new Date(ts)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDayLabel = (ts: number) => {
  const months = [
    'jan',
    'fev',
    'mar',
    'abr',
    'mai',
    'jun',
    'jul',
    'ago',
    'set',
    'out',
    'nov',
    'dez'
  ]
  const target = new Date(ts)
  const todayKey = getDayKey(Date.now())
  const yesterdayKey = getDayKey(Date.now() - 24 * 60 * 60 * 1000)
  const targetKey = getDayKey(ts)

  if (targetKey === todayKey) return 'Hoje'
  if (targetKey === yesterdayKey) return 'Ontem'

  const day = String(target.getDate()).padStart(2, '0')
  const month = months[target.getMonth()] || ''
  const year = target.getFullYear()
  return `${day} ${month} ${year}`
}

const groupHistoryEventsByDay = (events: HistoryEvent[]): DayGroup[] => {
  const groupsMap = new Map<string, DayGroup>()

  events.forEach((event) => {
    const ts = normalizeTimestamp(event.createdAt)
    const key = getDayKey(ts)
    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        key,
        label: formatDayLabel(ts),
        items: []
      })
    }
    groupsMap.get(key)!.items.push(event)
  })

  return Array.from(groupsMap.values()).sort((a, b) =>
    b.key.localeCompare(a.key)
  )
}

const getBalance = (events: HistoryEvent[]) => {
  const sales = events
    .filter((e) => e.type === 'sale')
    .reduce((acc, e) => acc + (e.amount || 0), 0)
  const payments = events
    .filter((e) => e.type === 'payment')
    .reduce((acc, e) => acc + (e.amount || 0), 0)
  const balance = sales - payments
  return { sales, payments, balance }
}

const getLastPaymentDate = (events: HistoryEvent[]) => {
  const lastPaymentTs = Math.max(
    0,
    ...events
      .filter((e) => e.type === 'payment')
      .map((e) => normalizeTimestamp(e.createdAt))
  )
  return lastPaymentTs > 0 ? lastPaymentTs : null
}

const shouldShowOpenDebtBanner = (events: HistoryEvent[]) => {
  const { balance } = getBalance(events)
  return balance > 0
}

const getInitials = (name: string) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

const getAvatarColors = (input: string) => {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  return {
    bg: `hsl(${hue}, 35%, 22%)`,
    text: `hsl(${hue}, 70%, 80%)`
  }
}

export function ClientsPage({
  clients,
  sales,
  payments,
  clientBalances,
  priceSettings,
  resetToListSignal,
  onAddClient,
  onEditClient,
  onAddSale,
  onPayDebt,
  onGenerateNote,
  onDeleteClient,
  onDeleteSale,
  onDeletePayment,
  onDetailsViewChange
}: ClientsPageProps) {
  const [view, setView] = useState<'LIST' | 'DETAILS'>('LIST')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [filterMode, setFilterMode] = useState<ClientFilter>('ALL')
  const [showPaymentPicker, setShowPaymentPicker] = useState(false)
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('ALL')
  const [showClientMenu, setShowClientMenu] = useState(false)
  const [isDebtOpen, setIsDebtOpen] = useState(false)
  const [showFloatingHeader, setShowFloatingHeader] = useState(false)

  useEffect(() => {
    onDetailsViewChange(view === 'DETAILS')
  }, [view, onDetailsViewChange])

  useEffect(() => {
    if (view === 'LIST') {
      setIsDebtOpen(false)
    }
    if (view !== 'LIST') {
      setShowPaymentPicker(false)
    }
  }, [view])

  useEffect(() => {
    setIsDebtOpen(false)
  }, [selectedClientId])

  useEffect(() => {
    setShowClientMenu(false)
  }, [selectedClientId, view])

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(handle)
  }, [searchQuery])

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const formatTimeLabel = (date: Date) =>
    date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const formatBannerDate = (ts: number) => {
    if (!ts) return ''
    const months = [
      'JAN',
      'FEV',
      'MAR',
      'ABR',
      'MAI',
      'JUN',
      'JUL',
      'AGO',
      'SET',
      'OUT',
      'NOV',
      'DEZ'
    ]
    const d = new Date(ts)
    const day = String(d.getDate()).padStart(2, '0')
    const month = months[d.getMonth()] || ''
    const year = String(d.getFullYear()).slice(-2)
    return `${day} ${month} ${year}`
  }

  const formatDateShort = (ts: number | null) => {
    if (!ts) return ''
    return new Date(ts).toLocaleDateString('pt-BR')
  }

  const paymentCandidates = useMemo(() => {
    return clients
      .filter((c) => (clientBalances.get(c.id) || 0) > 0)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [clients, clientBalances])

  useEffect(() => {
    if (paymentCandidates.length <= 1) {
      setShowPaymentPicker(false)
    }
  }, [paymentCandidates.length])

  const lastInteractions = useMemo(() => {
    const map = new Map<string, number>()
    clients.forEach((c) => map.set(c.id, 0))

    sales.forEach((s) => {
      const t = normalizeTimestamp(s.date as any)
      const cur = map.get(s.clientId) || 0
      if (t > cur) map.set(s.clientId, t)
    })

    payments.forEach((p) => {
      const t = normalizeTimestamp(p.date as any)
      const cur = map.get(p.clientId) || 0
      if (t > cur) map.set(p.clientId, t)
    })

    return map
  }, [clients, sales, payments])

  const filteredClients = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    let result = [...clients]

    if (q) {
      result = result.filter((client) =>
        `${client.name} ${client.phone || ''}`.toLowerCase().includes(q)
      )
    }

    if (filterMode === 'BALANCE') {
      result = result.filter(
        (client) => (clientBalances.get(client.id) || 0) > 0
      )
    }

    if (filterMode === 'ZERO') {
      result = result.filter(
        (client) => (clientBalances.get(client.id) || 0) === 0
      )
    }

    if (filterMode === 'AZ') {
      return result.sort((a, b) => a.name.localeCompare(b.name))
    }

    // Sort by recency (igual layout_original)
    return result.sort((a, b) => {
      const lastA = lastInteractions.get(a.id) || 0
      const lastB = lastInteractions.get(b.id) || 0
      if (lastB === lastA) return a.name.localeCompare(b.name)
      return lastB - lastA
    })
  }, [clients, debouncedQuery, filterMode, lastInteractions, clientBalances])

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId]
  )

  useEffect(() => {
    if (selectedClientId && !selectedClient) {
      setSelectedClientId(null)
      setView('LIST')
      setIsDebtOpen(false)
    }
  }, [selectedClientId, selectedClient])

  useEffect(() => {
    setView('LIST')
    setSelectedClientId(null)
    setIsDebtOpen(false)
  }, [resetToListSignal])

  useEffect(() => {
    if (view !== 'LIST') return
    const handleScroll = () => {
      setShowFloatingHeader(window.scrollY > 20)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [view])

  const selectedClientHistory = useMemo(() => {
    if (!selectedClientId) {
      return {
        events: [] as HistoryEvent[],
        groups: [] as DayGroup[],
        balance: 0,
        lastPaymentTs: null as number | null,
        bannerBalance: 0
      }
    }

    const historyEvents: HistoryEvent[] = [
      ...sales
        .filter((s) => s.clientId === selectedClientId)
        .map((s) => ({
          id: s.id,
          type: 'sale' as const,
          amount: s.totalValue,
          liters: s.liters,
          createdAt: s.date
        })),
      ...payments
        .filter((p) => p.clientId === selectedClientId)
        .map((p) => ({
          id: p.id,
          type: 'payment' as const,
          amount: p.amount,
          createdAt: p.date
        }))
    ]

    const sorted = sortHistoryEvents(historyEvents)
    const groups = groupHistoryEventsByDay(sorted)
    const lastPaymentTs = getLastPaymentDate(sorted)
    const { balance } = getBalance(sorted)

    let bannerBalance = 0
    if (lastPaymentTs) {
      const eventsUpToLastPayment = sorted.filter(
        (e) => normalizeTimestamp(e.createdAt) <= lastPaymentTs
      )
      const { balance: balAtLastPayment } = getBalance(eventsUpToLastPayment)
      bannerBalance = Math.max(0, balAtLastPayment)
    }

    return { events: sorted, groups, balance, lastPaymentTs, bannerBalance }
  }, [sales, payments, selectedClientId])

  const filteredHistoryGroups = useMemo(() => {
    const events = selectedClientHistory.events
    if (!events.length) return [] as DayGroup[]
    let filtered = events
    if (historyFilter === 'PAYMENTS') {
      filtered = events.filter((e) => e.type === 'payment')
    }
    if (historyFilter === 'SALES') {
      filtered = events.filter((e) => e.type === 'sale')
    }
    return groupHistoryEventsByDay(filtered)
  }, [selectedClientHistory.events, historyFilter])

  const getClientPrice = (client: Client) =>
    client.priceType === 'CUSTOM'
      ? priceSettings.custom
      : priceSettings.standard

  const openWhatsApp = (phone: string) => {
    const digits = (phone || '').replace(/\D/g, '')
    if (!digits) return
    const waNumber = digits.length >= 12 ? digits : `55${digits}`
    window.open(`https://wa.me/${waNumber}`, '_blank', 'noopener,noreferrer')
  }

  const handleOpenClient = (clientId: string) => {
    setSelectedClientId(clientId)
    setView('DETAILS')
  }

  const handleBackToList = () => {
    setView('LIST')
    setSelectedClientId(null)
  }

  const handlePaymentCTA = () => {
    if (paymentCandidates.length === 0) return
    if (paymentCandidates.length === 1) {
      onPayDebt(paymentCandidates[0].id)
      return
    }
    setShowPaymentPicker((prev) => !prev)
  }

  const handleSelectPaymentClient = (clientId: string) => {
    setShowPaymentPicker(false)
    onPayDebt(clientId)
  }

  const renderClientList = () => (
    <div
      data-theme='flat-lime'
      className='min-h-screen animate-fade-in'
      style={{
        background: 'var(--bg)',
        color: 'var(--text)',
        minHeight: '100vh',
        paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))',
        paddingLeft: 16,
        paddingRight: 16
      }}
    >
      {showFloatingHeader && (
        <div
          className='fixed top-0 left-0 right-0 z-30 flex items-center pointer-events-none'
          style={{
            paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))',
            paddingBottom: 10,
            paddingLeft: 16,
            paddingRight: 16,
            background:
              'linear-gradient(180deg, rgba(11, 15, 20, 0.98) 0%, rgba(11, 15, 20, 0.7) 45%, rgba(11, 15, 20, 0) 100%)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}
        >
          <h2 className='text-[24px] font-semibold leading-none' style={{ color: 'var(--text)' }}>
            Meus Clientes
          </h2>
        </div>
      )}
      <div className='mt-6 flex items-start justify-between gap-4 mb-4'>
        <div>
          <h1 className='text-[28px] font-semibold leading-none'>Meus Clientes</h1>
          <p className='mt-2 text-xs' style={{ color: 'var(--muted)' }}>
            {clients.length} cadastrados
          </p>
        </div>
        <button
          onClick={onAddClient}
          className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-transform active:scale-95 mt-1'
          style={{
            background: 'var(--accent)',
            color: 'var(--accent-ink)',
            border: '1px solid var(--accent)'
          }}
        >
          <Plus size={12} strokeWidth={3} />
          Novo
        </button>
      </div>
      {showPaymentPicker && paymentCandidates.length > 1 && (
        <div className='flat-card p-4 space-y-3'>
          <div className='flex items-center justify-between'>
            <p className='text-sm font-semibold'>
              Selecione um cliente para receber
            </p>
            <button
              type='button'
              onClick={() => setShowPaymentPicker(false)}
              style={{ color: 'var(--muted)' }}
              aria-label='Fechar sele\u00e7\u00e3o'
            >
              <X size={16} />
            </button>
          </div>
          <div className='max-h-56 overflow-y-auto no-scrollbar space-y-2'>
            {paymentCandidates.map((client) => {
              const balance = clientBalances.get(client.id) || 0
              const initials = getInitials(client.name)
              const colors = getAvatarColors(client.name)
              return (
                <button
                  key={client.id}
                  type='button'
                  onClick={() => handleSelectPaymentClient(client.id)}
                  className='w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl transition-colors text-left active:scale-[0.98]'
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <div className='flex items-center gap-3 min-w-0'>
                    <div
                      className='h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0'
                      style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                        boxShadow: '0 8px 20px -12px var(--shadow)'
                      }}
                    >
                      {initials}
                    </div>
                    <span className='text-sm font-semibold truncate'>
                      {client.name}
                    </span>
                  </div>
                  <span className='text-sm font-semibold tabular-nums' style={{ color: 'var(--accent)' }}>
                    {formatCurrency(balance)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {clients.length > 0 && (
        <>
          <div className='relative mb-2'>
            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
              <Search size={18} style={{ color: 'var(--muted)' }} />
            </div>
            <input
              type='text'
              className='w-full flat-input pl-10 pr-10 py-3 text-base outline-none focus:ring-2'
              placeholder='Buscar cliente por nome ou telefone...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'var(--surface-2)',
                color: 'var(--text)',
                borderColor: 'var(--border)',
                boxShadow: 'none',
                caretColor: 'var(--accent)',
                borderRadius: 9999
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className='absolute inset-y-0 right-0 pr-3 flex items-center active:scale-95'
                aria-label='Limpar busca'
                style={{ color: 'var(--muted)' }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className='flex gap-2 overflow-x-auto no-scrollbar pb-0.5 px-1'>
            {[
              { label: 'Todos', value: 'ALL' as const },
              { label: 'Com saldo', value: 'BALANCE' as const },
              { label: 'Zerados', value: 'ZERO' as const },
              { label: 'A-Z', value: 'AZ' as const }
            ].map((chip) => {
              const isActive = filterMode === chip.value
              return (
                <button
                  key={chip.value}
                  type='button'
                  onClick={() => setFilterMode(chip.value)}
                  className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors active:scale-95 flat-chip ${
                    isActive ? 'is-active' : ''
                  }`}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>
        </>
      )}

      <div className='mt-6 mb-3 flex items-center justify-between'>
        <h2 className='text-sm font-semibold uppercase tracking-wide' style={{ color: 'var(--muted)' }}>
          {searchQuery
            ? `Resultados (${filteredClients.length})`
            : 'Lista de Clientes'}
        </h2>
      </div>

      {clients.length === 0 ? (
        <div
          className='flat-card p-6 text-center'
          style={{ borderStyle: 'dashed', borderColor: 'var(--border)' }}
        >
          <UserIcon size={48} className='mx-auto mb-3' style={{ color: 'var(--muted)' }} />
          <p className='text-base font-semibold'>Nenhum cliente cadastrado.</p>
          <p className='text-sm' style={{ color: 'var(--muted)' }}>
            Adicione um novo cliente acima.
          </p>
          <button
            type='button'
            onClick={onAddClient}
            className='mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-transform active:scale-95'
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-ink)',
              border: '1px solid var(--accent)'
            }}
          >
            <Plus size={14} strokeWidth={3} />
            Adicionar cliente
          </button>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className='flat-card p-4 text-center'>
          <p className='text-sm' style={{ color: 'var(--muted)' }}>
            Nenhum cliente encontrado
          </p>
          <button
            type='button'
            onClick={() => {
              setSearchQuery('')
              setFilterMode('ALL')
            }}
            className='mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-transform active:scale-95'
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text)'
            }}
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className='space-y-[11px] pb-4'>
          {filteredClients.map((client) => {
            const balance = clientBalances.get(client.id) || 0
            const initials = getInitials(client.name)
            const colors = getAvatarColors(client.name)
            return (
              <button
                key={client.id}
                onClick={() => handleOpenClient(client.id)}
                className='w-full flat-card text-left transition-transform active:scale-[0.99]'
              >
                <div className='px-4 py-3 flex items-center justify-between gap-3'>
                  <div className='flex items-center gap-3 min-w-0'>
                    <div
                      className='h-11 w-11 rounded-full flex items-center justify-center text-xs font-bold shrink-0'
                      style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                        boxShadow: '0 8px 20px -12px var(--shadow)'
                      }}
                    >
                      {initials}
                    </div>

                    <div className='min-w-0'>
                      <p className='text-base font-semibold truncate'>{client.name}</p>
                      {client.phone ? (
                        <p className='text-xs truncate' style={{ color: 'var(--muted)' }}>
                          {client.phone}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className='flex items-center gap-3 shrink-0'>
                    <div className='text-right'>
                      <span
                        className='block text-[10px] font-semibold uppercase'
                        style={{ color: 'var(--muted)' }}
                      >
                        Saldo
                      </span>
                      <span
                        className='text-[19px] font-semibold tabular-nums'
                        style={{ color: balance > 0 ? 'var(--accent)' : 'var(--muted)' }}
                      >
                        {formatCurrency(balance)}
                      </span>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--muted)' }} />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )

  const renderClientDetails = () => {
    if (!selectedClient) return null

    const balance = clientBalances.get(selectedClient.id) || 0
    const clientPrice = getClientPrice(selectedClient)
    const lastPaymentEvent = selectedClientHistory.events.find((e) => e.type === 'payment')
    const lastPaymentAmount = lastPaymentEvent?.amount || 0
    const previousBalanceEstimate = Math.max(
      0,
      selectedClientHistory.bannerBalance + lastPaymentAmount
    )
    const initials = getInitials(selectedClient.name)
    const avatarColors = getAvatarColors(selectedClient.name)
    const hasSalesHistory = selectedClientHistory.events.some((e) => e.type === 'sale')
    const disableGenerateNote = balance <= 0 || !hasSalesHistory
    const historyHeaderLabel =
      historyFilter === 'SALES'
        ? 'Hist\u00f3rico de Vendas'
        : historyFilter === 'PAYMENTS'
          ? 'Hist\u00f3rico de Pagamentos'
          : 'Hist\u00f3rico de Movimenta\u00e7\u00f5es'
    const flattenedHistoryItems = filteredHistoryGroups.flatMap((group) => group.items)

    return (
      <div
        data-theme='flat-lime'
        className='animate-fade-in relative min-h-screen'
        style={{
          background: 'var(--bg)',
          color: 'var(--text)',
          paddingBottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))'
        }}
      >
        <div className='fixed top-0 left-0 right-0 z-50 max-w-2xl mx-auto px-4 pt-4 flex items-center justify-between pointer-events-none'>
          <button
            onClick={handleBackToList}
            className='pointer-events-auto h-10 w-10 rounded-full flex items-center justify-center transition-all active:scale-95'
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text)'
            }}
            aria-label='Voltar'
          >
            <ChevronLeft size={20} />
          </button>

          <div className='flex items-center gap-2 pointer-events-auto relative'>
            <button
              type='button'
              onClick={() => onEditClient(selectedClient)}
              className='h-10 w-10 rounded-full flex items-center justify-center transition-all active:scale-95'
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)'
              }}
              aria-label='Editar cliente'
            >
              <Pencil size={18} />
            </button>
            <button
              type='button'
              onClick={() => setShowClientMenu((prev) => !prev)}
              className='h-10 w-10 rounded-full flex items-center justify-center transition-all active:scale-95'
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)'
              }}
              aria-label='Menu'
            >
              <MoreVertical size={18} />
            </button>
            {showClientMenu && (
              <div
                className='absolute right-0 top-12 w-44 rounded-xl shadow-lg overflow-hidden'
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)'
                }}
              >
                <button
                  type='button'
                  onClick={() => {
                    setShowClientMenu(false)
                    onDeleteClient(selectedClient.id)
                  }}
                  className='w-full px-3 py-2 text-left text-sm transition-colors'
                  style={{ color: 'var(--danger)' }}
                >
                  Excluir cliente
                </button>
              </div>
            )}
          </div>
        </div>

        <div
          className='relative h-32 rounded-b-[2rem] shadow-md overflow-hidden'
          style={{
            background: 'linear-gradient(135deg, rgba(184, 255, 44, 0.22), rgba(11, 15, 20, 0.96))'
          }}
        >
          <div
            className='absolute top-[-30%] left-[-10%] w-44 h-44 rounded-full blur-3xl'
            style={{ background: 'rgba(184, 255, 44, 0.14)' }}
          />
          <div
            className='absolute bottom-[-35%] right-[-10%] w-44 h-44 rounded-full blur-3xl'
            style={{ background: 'rgba(184, 255, 44, 0.1)' }}
          />
        </div>

        <div className='px-6 -mt-12 relative z-10 flex flex-col items-center'>
          <div
            className='h-24 w-24 rounded-full border-4 shadow-xl flex items-center justify-center text-2xl font-bold'
            style={{
              backgroundColor: avatarColors.bg,
              color: avatarColors.text,
              borderColor: 'var(--bg)'
            }}
          >
            {initials}
          </div>

          <div className='mt-3 text-center'>
            <h2 className='text-2xl font-bold' style={{ color: 'var(--text)' }}>
              {selectedClient.name}
            </h2>
            <div className='flex justify-center gap-2 mt-2 flex-wrap overflow-x-auto no-scrollbar'>
              <span className='flat-chip px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide'>
                {selectedClient.priceType === 'STANDARD'
                  ? 'Preço padrão'
                  : 'Preço personalizado'}
              </span>
              <span className='flat-chip is-active px-3 py-1 rounded-full text-xs font-semibold'>
                {formatCurrency(clientPrice)}/L
              </span>
            </div>
          </div>

          {selectedClient.phone && (
            <button
              onClick={() => openWhatsApp(selectedClient.phone)}
              className='mt-3 flex items-center gap-2 px-4 py-2 rounded-xl shadow-sm transition-all active:scale-95 font-medium text-sm'
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-ink)',
                border: '1px solid var(--accent)'
              }}
            >
              <MessageCircle size={16} />
              WhatsApp
            </button>
          )}
        </div>

        <div className='px-4 mt-6 space-y-5'>
          <div className='flat-card p-5 shadow-sm flex justify-between items-center'>
            <div>
              <p
                className='text-xs font-semibold uppercase tracking-wide mb-1'
                style={{ color: 'var(--muted)' }}
              >
                Total a receber
              </p>
              <p
                className='text-3xl font-bold tracking-tight'
                style={{ color: balance > 0 ? 'var(--text)' : 'var(--muted)' }}
              >
                {formatCurrency(balance)}
              </p>
            </div>

            <div
              className='h-11 w-11 rounded-xl flex items-center justify-center border'
              style={
                balance > 0
                  ? {
                      borderColor: 'var(--accent)',
                      background: 'rgba(184, 255, 44, 0.14)',
                      color: 'var(--accent)'
                    }
                  : {
                      borderColor: 'var(--border)',
                      background: 'var(--surface-2)',
                      color: 'var(--muted)'
                    }
              }
            >
              {balance > 0 ? <Wallet size={20} /> : <CheckCircle size={20} />}
            </div>
          </div>

          <ClientActionBarInline
            onAddSale={() => onAddSale(selectedClient.id)}
            onReceive={() => onPayDebt(selectedClient.id)}
            onGenerateNote={() => onGenerateNote(selectedClient.id)}
            disableReceive={balance <= 0}
            disableGenerateNote={disableGenerateNote}
            className='w-full'
          />

          <div>
            <div className='flex items-center justify-between mb-3 px-1'>
              <h3
                className='text-xs font-semibold uppercase tracking-wider'
                style={{ color: 'var(--muted)' }}
              >
                Histórico
              </h3>
            </div>

            <div className='flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4'>
              {[
                { label: 'Todos', value: 'ALL' as const },
                { label: 'Recebidos', value: 'PAYMENTS' as const },
                { label: 'Vendas', value: 'SALES' as const }
              ].map((chip) => {
                const isActive = historyFilter === chip.value
                return (
                  <button
                    key={chip.value}
                    type='button'
                    onClick={() => setHistoryFilter(chip.value)}
                    className='px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95'
                    style={
                      isActive
                        ? {
                            background: 'rgba(184, 255, 44, 0.15)',
                            borderColor: 'rgba(184, 255, 44, 0.7)',
                            color: 'var(--text)'
                          }
                        : {
                            background: 'rgba(14, 20, 28, 0.7)',
                            borderColor: 'rgba(30, 42, 56, 0.9)',
                            color: 'var(--muted)'
                          }
                    }
                  >
                    {chip.label}
                  </button>
                )
              })}
            </div>

            {selectedClientHistory.bannerBalance > 0 ? (
              <div className='mb-3'>
                <button
                  type='button'
                  onClick={() => setIsDebtOpen((prev) => !prev)}
                  className={`w-full rounded-xl text-left shadow-sm transition-all focus:outline-none ${
                    isDebtOpen ? 'ring-1 ring-amber-400/40' : ''
                  } active:scale-[0.99]`}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)'
                  }}
                  aria-expanded={isDebtOpen}
                >
                  <div className='flex items-center gap-3 px-3 py-3'>
                    <span className='inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold uppercase rounded-full bg-amber-500/20 text-amber-50 border border-amber-500/40'>
                      Pendente
                    </span>
                    <p className='text-sm font-semibold text-slate-100 flex-1 min-w-0 truncate'>
                      Saldo pendente:
                    </p>
                    <span className='text-xs font-semibold text-amber-100 flex items-center gap-1 shrink-0'>
                      {isDebtOpen ? 'Ocultar' : 'Ver'}
                      {isDebtOpen ? (
                        <ChevronUp size={14} className='text-amber-100' />
                      ) : (
                        <ChevronDown size={14} className='text-amber-100' />
                      )}
                    </span>
                  </div>
                  <div
                    className={`overflow-hidden transition-all duration-200 ${
                      isDebtOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className='px-3 pb-3 pt-2 border-t border-slate-700/70 space-y-2'>
                      <p className='text-xs leading-snug text-slate-300'>
                        {selectedClientHistory.lastPaymentTs
                          ? `Após o pagamento de ${formatCurrency(
                              lastPaymentAmount
                            )}, o total de ${formatCurrency(
                              previousBalanceEstimate
                            )} ficou com saldo pendente.`
                          : 'Sem pagamento registrado; saldo pendente atualizado com a última movimentação.'}
                      </p>
                      <p className='text-xs leading-snug text-slate-300'>
                        Último pagamento:{' '}
                        <span className='font-semibold text-white'>
                          {selectedClientHistory.lastPaymentTs
                            ? formatDateShort(selectedClientHistory.lastPaymentTs)
                            : 'Sem pagamento'}
                        </span>
                      </p>
                      <p className='text-sm leading-snug text-amber-100'>
                        Saldo pendente:{' '}
                        <span className='font-bold text-amber-200'>
                          {formatCurrency(selectedClientHistory.bannerBalance)}
                        </span>
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            ) : null}

            {filteredHistoryGroups.length === 0 ? (
              <div
                className='text-center py-8 rounded-2xl border border-dashed'
                style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}
              >
                <p style={{ color: 'var(--muted)' }}>
                  {'Nenhuma movimenta\u00e7\u00e3o registrada.'}
                </p>
              </div>
            ) : (
              <div
                className='rounded-[22px] border overflow-hidden'
                style={{
                  background:
                    'linear-gradient(180deg, rgba(18, 24, 33, 0.96) 0%, rgba(14, 19, 26, 0.92) 100%)',
                  borderColor: 'rgba(30, 42, 56, 0.9)',
                  boxShadow: '0 18px 36px -28px rgba(0, 0, 0, 0.7)'
                }}
              >
                <div
                  className='flex items-center gap-3 px-4 py-3 border-b'
                  style={{ borderColor: 'rgba(30, 42, 56, 0.9)' }}
                >
                  <ShoppingCart size={16} style={{ color: 'var(--text)' }} />
                  <span className='text-sm font-semibold' style={{ color: 'var(--text)' }}>
                    {historyHeaderLabel}
                  </span>
                </div>

                <div>
                  {flattenedHistoryItems.map((item, index) => {
                    const isSale = item.type === 'sale'
                    const litersValue = typeof item.liters === 'number' ? item.liters : null
                    const litersLabel =
                      litersValue !== null
                        ? `${litersValue.toLocaleString('pt-BR', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2
                          })} ${litersValue === 1 ? 'Litro' : 'Litros'}`
                        : ''
                    const title =
                      isSale && litersLabel
                        ? `Venda - ${litersLabel}`
                        : isSale
                          ? 'Venda'
                          : 'Pagamento recebido'

                    const amount = item.amount
                    const ts = normalizeTimestamp(item.createdAt)
                    const dateLabel = formatDateShort(ts)
                    const isSinglePayment =
                      flattenedHistoryItems.length === 1 && item.type === 'payment'

                    return (
                      <div key={`${item.type}-${item.id}`} className='px-4'>
                        {index > 0 && (
                          <div
                            className='h-px'
                            style={{
                              background: 'rgba(255, 255, 255, 0.06)',
                              marginLeft: 0,
                              marginRight: 0
                            }}
                          />
                        )}
                        <div className='flex items-center justify-between gap-6 py-4'>
                          <div className='flex items-center gap-3 min-w-0'>
                            <div
                              className='h-10 w-10 rounded-full flex items-center justify-center border shrink-0'
                              style={
                                isSale
                                  ? {
                                      background: 'rgba(255, 193, 7, 0.18)',
                                      borderColor: 'rgba(255, 193, 7, 0.45)',
                                      color: '#fbbf24'
                                    }
                                  : {
                                      background: 'rgba(34, 197, 94, 0.18)',
                                      borderColor: 'rgba(34, 197, 94, 0.45)',
                                      color: '#4ade80'
                                    }
                              }
                            >
                              {isSale ? <ShoppingCart size={16} /> : <CheckCircle size={16} />}
                            </div>
                            <div className='min-w-0 space-y-1'>
                              <p className='text-sm font-semibold truncate' style={{ color: 'var(--text)' }}>
                                {title}
                              </p>
                              <p className='text-xs' style={{ color: 'var(--muted)' }}>
                                {dateLabel}
                              </p>
                            </div>
                          </div>

                          <div className='flex items-center gap-3 shrink-0'>
                            <div className='flex flex-col items-end'>
                              <span
                                className='text-sm font-semibold tabular-nums'
                                style={{ color: isSinglePayment ? 'var(--accent)' : 'var(--text)' }}
                              >
                                {formatCurrency(amount)}
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                isSale
                                  ? onDeleteSale(item.id)
                                  : onDeletePayment(item.id)
                              }
                              className='p-1.5 rounded-full transition-colors opacity-70 hover:opacity-100'
                              style={{ color: 'var(--muted)' }}
                              aria-label='Excluir'
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
  return view === 'LIST' ? renderClientList() : renderClientDetails()
}









