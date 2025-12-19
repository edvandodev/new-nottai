import React, { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  AlertTriangle,
  DollarSign,
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

  const totalReceivable = useMemo(() => {
    return clients.reduce((acc, c) => {
      const bal = clientBalances.get(c.id) || 0
      return acc + Math.max(0, bal)
    }, 0)
  }, [clients, clientBalances])

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
      className='space-y-4 animate-fade-in'
      style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className='bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between relative overflow-hidden'>
        <div className='absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none' />
        <div className='relative z-10'>
          <span className='block text-slate-400 text-sm font-medium mb-1'>
            Total a Receber
          </span>
          <span className='text-3xl font-bold text-green-400 tracking-tight'>
            {formatCurrency(totalReceivable)}
          </span>
        </div>
        <button
          type='button'
          onClick={handlePaymentCTA}
          disabled={paymentCandidates.length === 0}
          className={`relative z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
            paymentCandidates.length > 0
              ? 'bg-emerald-600/20 text-emerald-200 border border-emerald-500/30 hover:bg-emerald-600/30'
              : 'bg-slate-800/60 text-slate-500 border border-slate-700 cursor-not-allowed'
          }`}
        >
          <DollarSign size={14} />
          Receber
        </button>
      </div>

      {showPaymentPicker && paymentCandidates.length > 1 && (
        <div className='bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-3'>
            <p className='text-sm font-semibold text-slate-200'>
              Selecione um cliente para receber
            </p>
            <button
              type='button'
              onClick={() => setShowPaymentPicker(false)}
              className='text-slate-500 hover:text-slate-200 transition-colors'
              aria-label='Fechar seleÃ§Ã£o'
            >
              <X size={16} />
            </button>
          </div>
          <div className='max-h-56 overflow-y-auto custom-scrollbar space-y-2'>
            {paymentCandidates.map((client) => {
              const balance = clientBalances.get(client.id) || 0
              const initials = getInitials(client.name)
              const colors = getAvatarColors(client.name)
              return (
                <button
                  key={client.id}
                  type='button'
                  onClick={() => handleSelectPaymentClient(client.id)}
                  className='w-full flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-left hover:border-slate-700 transition-all active:scale-[0.98]'
                >
                  <div className='flex items-center gap-3 min-w-0'>
                    <div
                      className='h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0'
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                    >
                      {initials}
                    </div>
                    <span className='text-sm text-slate-100 font-semibold truncate'>
                      {client.name}
                    </span>
                  </div>
                  <span className='text-sm font-semibold text-emerald-300 tabular-nums'>
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
          <div className='relative'>
            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
              <Search size={18} className='text-slate-500' />
            </div>
            <input
              type='text'
              className='w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-10 pr-10 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all'
              placeholder='Buscar cliente por nome ou telefone...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className='absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white transition-colors active:scale-95'
                aria-label='Limpar busca'
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className='flex gap-2 overflow-x-auto no-scrollbar pt-0.5'>
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
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-200 border-blue-500/30'
                      : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>
        </>
      )}

      <div className='flex justify-between items-center pt-1 pb-1'>
        <h2 className='text-sm uppercase tracking-wider text-slate-500 font-semibold ml-1'>
          {searchQuery
            ? `Resultados (${filteredClients.length})`
            : 'Lista de Clientes'}
        </h2>
        <button
          onClick={onAddClient}
          className='flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95'
        >
          <Plus size={14} strokeWidth={3} />
          NOVO CLIENTE
        </button>
      </div>

      {clients.length === 0 ? (
        <div className='text-center py-20 px-6 rounded-2xl bg-slate-900 border border-slate-800 border-dashed'>
          <UserIcon size={48} className='mx-auto text-slate-700 mb-4' />
          <p className='text-slate-400 text-lg'>Nenhum cliente cadastrado.</p>
          <p className='text-slate-600 text-sm mt-1'>
            Adicione um novo cliente acima.
          </p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className='text-center py-16 px-6 rounded-2xl bg-slate-900/60 border border-slate-800'>
          <p className='text-slate-400 text-base'>Nenhum cliente encontrado</p>
        </div>
      ) : (
        <div className='space-y-2'>
          {filteredClients.map((client) => {
            const balance = clientBalances.get(client.id) || 0
            const initials = getInitials(client.name)
            const colors = getAvatarColors(client.name)
            return (
              <button
                key={client.id}
                onClick={() => handleOpenClient(client.id)}
                className='w-full bg-slate-900/60 rounded-xl border border-slate-800 shadow-[0_6px_18px_rgba(0,0,0,0.18)] transition-all hover:border-slate-700 active:scale-[0.98] active:opacity-90 text-left'
              >
                <div className='px-3.5 py-3 flex items-center justify-between gap-3'>
                  <div className='flex items-center gap-3 min-w-0'>
                    <div
                      className='h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0'
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                    >
                      {initials}
                    </div>

                    <div className='min-w-0'>
                      <p className='text-white font-semibold truncate'>
                        {client.name}
                      </p>
                      {client.phone ? (
                        <p className='text-slate-500 text-xs truncate'>
                          {client.phone}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className='flex items-center gap-3 shrink-0'>
                    <div className='text-right'>
                      <span className='block text-[10px] text-slate-500 font-semibold uppercase'>
                        Saldo
                      </span>
                      <span
                        className={`text-base font-bold tabular-nums ${
                          balance > 0 ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {formatCurrency(balance)}
                      </span>
                    </div>
                    <ChevronRight size={16} className='text-slate-600' />
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

    return (
      <div
        className='animate-fade-in relative min-h-screen bg-slate-950'
        style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className='fixed top-0 left-0 right-0 z-50 max-w-2xl mx-auto px-4 pt-4 flex items-center justify-between pointer-events-none'>
          <button
            onClick={handleBackToList}
            className='pointer-events-auto h-10 w-10 rounded-full bg-slate-900/60 border border-white/10 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95'
            aria-label='Voltar'
          >
            <ChevronLeft size={20} />
          </button>

          <div className='flex items-center gap-2 pointer-events-auto relative'>
            <button
              type='button'
              onClick={() => onEditClient(selectedClient)}
              className='h-10 w-10 rounded-full bg-slate-900/60 border border-white/10 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95'
              aria-label='Editar cliente'
            >
              <Pencil size={18} />
            </button>
            <button
              type='button'
              onClick={() => setShowClientMenu((prev) => !prev)}
              className='h-10 w-10 rounded-full bg-slate-900/60 border border-white/10 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95'
              aria-label='Menu'
            >
              <MoreVertical size={18} />
            </button>
            {showClientMenu && (
              <div className='absolute right-0 top-12 w-44 rounded-xl border border-slate-800 bg-slate-900/95 shadow-lg overflow-hidden'>
                <button
                  type='button'
                  onClick={() => {
                    setShowClientMenu(false)
                    onDeleteClient(selectedClient.id)
                  }}
                  className='w-full px-3 py-2 text-left text-sm text-red-200 hover:bg-red-500/10 transition-colors'
                >
                  Excluir cliente
                </button>
              </div>
            )}
          </div>
        </div>

        <div className='relative h-32 bg-gradient-to-br from-blue-700 to-blue-900/90 rounded-b-[2rem] shadow-md overflow-hidden'>
          <div className='absolute top-[-30%] left-[-10%] w-44 h-44 rounded-full bg-white/5 blur-3xl' />
          <div className='absolute bottom-[-35%] right-[-10%] w-44 h-44 rounded-full bg-blue-400/10 blur-3xl' />
        </div>

        <div className='px-6 -mt-12 relative z-10 flex flex-col items-center'>
          <div
            className='h-24 w-24 rounded-full border-4 border-slate-950 shadow-xl flex items-center justify-center text-2xl font-bold'
            style={{ backgroundColor: avatarColors.bg, color: avatarColors.text }}
          >
            {initials}
          </div>

          <div className='mt-3 text-center'>
            <h2 className='text-2xl font-bold text-white'>
              {selectedClient.name}
            </h2>
            <div className='flex justify-center gap-2 mt-2 flex-wrap overflow-x-auto no-scrollbar'>
              <span className='px-3 py-1 bg-slate-900/60 border border-slate-800 rounded-full text-xs font-semibold text-slate-400 uppercase tracking-wide'>
                {selectedClient.priceType === 'STANDARD'
                  ? 'Preço padrão'
                  : 'Preço personalizado'}
              </span>
              <span className='px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-full text-xs font-semibold text-blue-200'>
                {formatCurrency(clientPrice)}/L
              </span>
            </div>
          </div>

          {selectedClient.phone && (
            <button
              onClick={() => openWhatsApp(selectedClient.phone)}
              className='mt-3 flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl shadow-sm hover:bg-green-500 transition-all active:scale-95 font-medium text-sm'
            >
              <MessageCircle size={16} />
              WhatsApp
            </button>
          )}
        </div>

        <div className='px-4 mt-6 space-y-5'>
          <div className='bg-slate-900/70 rounded-2xl p-5 border border-slate-800 shadow-sm flex justify-between items-center'>
            <div>
              <p className='text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1'>
                Total a receber
              </p>
              <p
                className={`text-3xl font-bold tracking-tight ${
                  balance > 0 ? 'text-white' : 'text-slate-500'
                }`}
              >
                {formatCurrency(balance)}
              </p>
            </div>

            <div
              className={`h-11 w-11 rounded-xl flex items-center justify-center border ${
                balance > 0
                  ? 'border-blue-500/30 bg-blue-600/15 text-blue-300'
                  : 'border-emerald-500/30 bg-emerald-600/15 text-emerald-300'
              }`}
            >
              {balance > 0 ? <Wallet size={20} /> : <CheckCircle size={20} />}
            </div>
          </div>

          <div className='flex gap-3'>
            <button
              onClick={() => onAddSale(selectedClient.id)}
              className='flex-1 h-11 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95'
            >
              <Plus size={18} />
              Nova Venda
            </button>

            <button
              onClick={() => onPayDebt(selectedClient.id)}
              disabled={balance <= 0}
              className={`flex-1 h-11 rounded-xl font-semibold shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                balance > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <DollarSign size={18} />
              Receber
            </button>
          </div>

          <div>
            <div className='flex items-center justify-between mb-3 px-1'>
              <h3 className='text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                Histórico
              </h3>
            </div>

            <div className='flex gap-2 overflow-x-auto no-scrollbar pb-2'>
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
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-200 border-blue-500/30'
                        : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
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
                  className={`w-full rounded-xl border border-slate-700 bg-slate-900/70 text-slate-100 shadow-sm text-left transition-all focus:outline-none ${
                    isDebtOpen ? 'ring-1 ring-amber-400/40' : ''
                  } hover:border-slate-600 active:scale-[0.99]`}
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
              <div className='text-center py-8 rounded-2xl border border-slate-800 border-dashed bg-slate-900/30'>
                <p className='text-slate-500'>Nenhuma movimentação registrada.</p>
              </div>
            ) : (
              <div className='space-y-4'>
                {filteredHistoryGroups.map((group) => (
                  <div key={group.key} className='space-y-2'>
                    <span className='inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-slate-900/60 border border-slate-800 text-slate-400'>
                      {group.label}
                    </span>
                    <div className='space-y-2'>
                      {group.items.map((item) => {
                        const isSale = item.type === 'sale'
                        const isPayment = item.type === 'payment'
                        const title = isSale ? 'Venda' : 'Pagamento recebido'

                        const amount = item.amount
                        const ts = normalizeTimestamp(item.createdAt)
                        const dateObj = new Date(ts)
                        const timeLabel = formatTimeLabel(dateObj)
                        const dateLabel = formatDateShort(ts)

                        return (
                          <div
                            key={`${item.type}-${item.id}`}
                            className='bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-3 flex items-center justify-between gap-3 transition-all active:scale-[0.98] active:opacity-90'
                          >
                            <div className='flex items-center gap-3 min-w-0'>
                              <div
                                className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 border ${
                                  isSale
                                    ? 'border-blue-500/30 bg-blue-600/15 text-blue-300'
                                    : 'border-emerald-500/30 bg-emerald-600/15 text-emerald-300'
                                }`}
                              >
                                {isSale ? (
                                  <ShoppingCart size={16} />
                                ) : (
                                  <CheckCircle size={16} />
                                )}
                              </div>

                              <div className='min-w-0'>
                                <p className='text-white font-semibold truncate'>
                                  {title}
                                </p>
                                <p className='text-slate-500 text-xs'>
                                  {dateLabel} • {timeLabel}
                                </p>
                              </div>
                            </div>

                            <div className='flex items-center gap-2 shrink-0'>
                              <span
                                className={`text-sm font-bold tabular-nums ${
                                  isPayment ? 'text-emerald-400' : 'text-blue-300'
                                }`}
                              >
                                {formatCurrency(amount)}
                              </span>
                              <button
                                onClick={() =>
                                  isSale
                                    ? onDeleteSale(item.id)
                                    : onDeletePayment(item.id)
                                }
                                className='p-2 text-slate-600 hover:text-red-400 transition-colors'
                                aria-label='Excluir'
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
  return view === 'LIST' ? renderClientList() : renderClientDetails()
}







