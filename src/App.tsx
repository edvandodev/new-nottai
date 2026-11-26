import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { firestoreService } from './services/firestore'
import { authService, type AppUser } from './services/auth'
import { ensureUserInitialized } from './services/bootstrap'
import { offlineWrites } from './services/offlineWrites'
import { pendingQueue } from './services/pendingQueue'
import {
  Client,
  Sale,
  Payment,
  PriceSettings,
  PriceType,
  PaymentStatus,
  Cow,
  CalvingEvent,
  TabState
} from './types'
import {
  AddClientModal,
  AddSaleModal,
  PayDebtModal,
  ConfirmModal,
  SuccessReceiptModal
} from './components/Modals'
import { createReceiptFile } from './services/pdfGenerator'
import type { ReceiptFileRef } from './services/pdfGenerator'
import { ReceiptViewer } from './components/receipt/ReceiptViewer'
import { WorkspaceShell } from './components/WorkspaceShell'
import { SaleClientPicker } from './components/SaleClientPicker'
import { SyncStatusPill } from './components/SyncStatusPill'
import { PendingQueueModal } from './components/PendingQueueModal'
import { optimisticStore } from './services/optimisticStore'

// Import Pages
import { ClientsPage } from './pages/clients'
import { CustomerNotePreviewPage } from './pages/clients/CustomerNotePreviewPage'
import { ReportsPage } from './pages/reports'
import { ReproductionPage } from './pages/reproduction'
import { SettingsPage } from './pages/settings'
import { PaymentsPage } from './pages/payments'
import { DashboardPage } from './pages/dashboard'
import { AuthPage } from './pages/auth'
import { NewClientPage } from './NewClientPage'

const DEFAULT_SETTINGS: PriceSettings = {
  standard: 0,
  custom: 0
}

const base64ToBlob = (base64: string, mimeType: string) => {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mimeType })
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [authReady, setAuthReady] = useState(false)
  const [user, setUser] = useState<AppUser | null>(null)
  const [dataReady, setDataReady] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  const [retryTick, setRetryTick] = useState(0)
  const hydratedPending = useRef(false)
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false)
  const mergeWithPending = <T extends { id: string }>(
    remote: T[],
    local: T[],
    keyFn: (item: T) => string
  ): T[] => {
    const remoteMap = new Map(remote.map((item) => [item.id, item]))
    const result = [...remote]
    local.forEach((item) => {
      const key = keyFn(item)
      if (optimisticStore.isPending(key) && !remoteMap.has(item.id)) {
        result.push(item)
      }
    })
    return result
  }

  // Navigation State
  const [activeTab, setActiveTab] = useState<TabState>('DASHBOARD')
  const [reportsStart, setReportsStart] = useState<Date>()
  const [isClientDetailsView, setIsClientDetailsView] = useState(false)

  // Data State
  const [clients, setClients] = useState<Client[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [cows, setCows] = useState<Cow[]>([])
  const [calvings, setCalvings] = useState<CalvingEvent[]>([])
  const [priceSettings, setPriceSettings] =
    useState<PriceSettings>(DEFAULT_SETTINGS)

  // UI State
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null) // For modals
  const [resetClientsSignal, setResetClientsSignal] = useState(0)

  // Modal State
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false)
  const [isSalePickerOpen, setIsSalePickerOpen] = useState(false)
  const [isPayModalOpen, setIsPayModalOpen] = useState(false)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)

  // Deletion and Confirmation State
  const [clientToDeleteId, setClientToDeleteId] = useState<string | null>(null)
  const [saleToDeleteId, setSaleToDeleteId] = useState<string | null>(null)
  const [paymentToDeleteId, setPaymentToDeleteId] = useState<string | null>(null)
  const [lastBackTime, setLastBackTime] = useState(0)
  const [lastPaymentInfo, setLastPaymentInfo] = useState<{
    clientName: string
    amount: number
    sales: Sale[]
    date: string
  } | null>(null)
  const [isReceiptViewerOpen, setIsReceiptViewerOpen] = useState(false)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [receiptFile, setReceiptFile] = useState<ReceiptFileRef | null>(null)
  const [receiptBlob, setReceiptBlob] = useState<Blob | null>(null)
  const [receiptShareInfo, setReceiptShareInfo] = useState<{
    clientName: string
    amount: number
    date: string
  } | null>(null)
  const [isNoteViewerOpen, setIsNoteViewerOpen] = useState(false)
  const [noteUrl, setNoteUrl] = useState<string | null>(null)
  const [noteFile, setNoteFile] = useState<ReceiptFileRef | null>(null)
  const [noteBlob, setNoteBlob] = useState<Blob | null>(null)
  const [noteShareInfo, setNoteShareInfo] = useState<{
    clientName: string
    periodLabel: string
    balance: number
  } | null>(null)
  const [editingClientLoadedUpdatedAt, setEditingClientLoadedUpdatedAt] =
    useState<number>(0)

  // Email verification state
  const [isSendingVerification, setIsSendingVerification] = useState(false)
  const [isCheckingVerification, setIsCheckingVerification] = useState(false)

  const revokePdfObjectUrl = useCallback((url?: string | null) => {
    if (!url) return
    try {
      URL.revokeObjectURL(url)
    } catch (err) {
      console.warn('Falha ao revogar URL do PDF', err)
    }
  }, [])

  const closeReceiptViewer = useCallback(() => {
    setIsReceiptViewerOpen(false)
    revokePdfObjectUrl(receiptUrl)
    if (receiptFile?.source === 'web') {
      revokePdfObjectUrl(receiptFile.uri)
    }
    setReceiptUrl(null)
    setReceiptBlob(null)
    setReceiptFile(null)
    setReceiptShareInfo(null)
  }, [receiptFile, receiptUrl, revokePdfObjectUrl])

  const closeNoteViewer = useCallback(() => {
    setIsNoteViewerOpen(false)
    revokePdfObjectUrl(noteUrl)
    if (noteFile?.source === 'web') {
      revokePdfObjectUrl(noteFile.uri)
    }
    setNoteUrl(null)
    setNoteBlob(null)
    setNoteFile(null)
    setNoteShareInfo(null)
  }, [noteFile, noteUrl, revokePdfObjectUrl])

  useEffect(() => {
    return () => {
      revokePdfObjectUrl(receiptUrl)
      if (receiptFile?.source === 'web') {
        revokePdfObjectUrl(receiptFile.uri)
      }
      revokePdfObjectUrl(noteUrl)
      if (noteFile?.source === 'web') {
        revokePdfObjectUrl(noteFile.uri)
      }
    }
  }, [noteFile, noteUrl, receiptFile, receiptUrl, revokePdfObjectUrl])

  useEffect(() => {
    authService.setLanguageToPortuguese().catch(() => undefined)
  }, [])

  // Auth
  useEffect(() => {
    let isMounted = true

    const unsubscribe = authService.onAuthStateChange((nextUser) => {
      if (!isMounted) return
      setUser(nextUser)
    })

    ;(async () => {
      try {
        const current = await authService.getCurrentUser()
        if (isMounted) setUser(current)
      } catch (error) {
        console.error('Falha ao obter usuario atual', error)
      } finally {
        if (isMounted) setAuthReady(true)
      }
    })()

    return () => {
      isMounted = false
      unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    firestoreService.setUser(user?.uid ?? null)
    if (!user) {
      setDataReady(false)
      setDataError(null)
      hydratedPending.current = false
      setClients([])
      setSales([])
      setPayments([])
      setCows([])
      setCalvings([])
      setPriceSettings(DEFAULT_SETTINGS)
    }
  }, [user])

  useEffect(() => {
    if (!authReady || !user) return

    let cancelled = false

    const run = async () => {
      setDataReady(false)
      setDataError(null)
      firestoreService.setUser(user.uid)
      const cleanupAuto = pendingQueue.startAutoProcessor()
      pendingQueue.processNow().catch(() => {})

      try {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          setDataReady(true)
          return cleanupAuto
        }
        await ensureUserInitialized(user.uid, {
          isAnonymous: user.isAnonymous,
          displayName: user.displayName || (user.isAnonymous ? 'Teste' : null)
        })
        if (!cancelled) setDataReady(true)
        return cleanupAuto
      } catch (error) {
        console.error('Falha ao preparar conta', error)
        if (!cancelled) {
          setDataError(
            'N\u00e3o foi poss\u00edvel preparar sua conta. Verifique sua internet e tente novamente.'
          )
        }
        return cleanupAuto
      }
    }

    let cleanup: (() => void) | void
    run().then((c) => {
      cleanup = c
    })

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [authReady, user, retryTick])

  useEffect(() => {
    if (!authReady || !user || !dataReady) return
    if (hydratedPending.current) return

    let cancelled = false

    ;(async () => {
      try {
        const items = await pendingQueue.getAll()
        if (cancelled) return
        items.forEach((item) => {
          optimisticStore.apply({
            type: item.type,
            key: item.key,
            payload: item.payload,
            createdAt: item.createdAt
          })
        })
        hydratedPending.current = true
      } catch (error) {
        console.error('Falha ao reidratar pendencias', error)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [authReady, user, dataReady])

  useEffect(() => {
    const unsub = optimisticStore.subscribe((event) => {
      if (event.type === 'APPLY') {
        const action = event.action
        switch (action.type) {
          case 'UPSERT_CLIENT': {
            setClients((prev) => {
              const idx = prev.findIndex((c) => c.id === action.payload.id)
              if (idx >= 0) {
                const next = [...prev]
                next[idx] = { ...prev[idx], ...action.payload }
                return next
              }
              return [...prev, action.payload]
            })
            break
          }
          case 'DELETE_CLIENT': {
            setClients((prev) => prev.filter((c) => c.id !== action.payload))
            break
          }
          case 'UPSERT_SALE': {
            setSales((prev) => {
              const idx = prev.findIndex((s) => s.id === action.payload.id)
              if (idx >= 0) {
                const next = [...prev]
                next[idx] = { ...prev[idx], ...action.payload }
                return next
              }
              return [...prev, action.payload]
            })
            break
          }
          case 'DELETE_SALE': {
            setSales((prev) => prev.filter((s) => s.id !== action.payload))
            break
          }
          case 'UPSERT_PAYMENT': {
            const { payment, salesToMarkAsPaid } = action.payload
            setPayments((prev) => {
              const idx = prev.findIndex((p) => p.id === payment.id)
              if (idx >= 0) {
                const next = [...prev]
                next[idx] = { ...prev[idx], ...payment }
                return next
              }
              return [...prev, payment]
            })
            if (salesToMarkAsPaid?.length) {
              setSales((prev) =>
                prev.map((s) =>
                  salesToMarkAsPaid.some((sm: Sale) => sm.id === s.id)
                    ? { ...s, isPaid: true }
                    : s
                )
              )
            }
            break
          }
          case 'DELETE_PAYMENT': {
            setPayments((prev) => prev.filter((p) => p.id !== action.payload))
            break
          }
          case 'SAVE_PRICE_SETTINGS': {
            setPriceSettings(action.payload)
            break
          }
          case 'UPSERT_COW': {
            setCows((prev) => {
              const idx = prev.findIndex((c) => c.id === action.payload.id)
              if (idx >= 0) {
                const next = [...prev]
                next[idx] = { ...prev[idx], ...action.payload }
                return next
              }
              return [...prev, action.payload]
            })
            break
          }
          case 'DELETE_COW': {
            setCows((prev) => prev.filter((c) => c.id !== action.payload))
            setCalvings((prev) => prev.filter((e) => e.cowId !== action.payload))
            break
          }
          case 'UPSERT_CALVING': {
            setCalvings((prev) => {
              const idx = prev.findIndex((e) => e.id === action.payload.id)
              if (idx >= 0) {
                const next = [...prev]
                next[idx] = { ...prev[idx], ...action.payload }
                return next
              }
              return [...prev, action.payload]
            })
            break
          }
          case 'DELETE_CALVING': {
            setCalvings((prev) => prev.filter((e) => e.id !== action.payload))
            break
          }
          default:
            break
        }
      }
    })
    return () => {
      unsub?.()
    }
  }, [])

  // Firestore Listeners
  useEffect(() => {
    if (!authReady || !user || !dataReady) return

    let cancelled = false
    const unsubscribers = [
      firestoreService.listenToClients((remoteClients) => {
        if (cancelled) return
        setClients((prev) =>
          mergeWithPending(remoteClients, prev, (c) => `client:${c.id}`)
        )
      }),
      firestoreService.listenToSales((remoteSales) => {
        if (cancelled) return
        setSales((prev) =>
          mergeWithPending(remoteSales, prev, (s) => `sale:${s.id}`)
        )
      }),
      firestoreService.listenToPayments((remotePayments) => {
        if (cancelled) return
        setPayments((prev) =>
          mergeWithPending(remotePayments, prev, (p) => `payment:${p.id}`)
        )
      }),
      firestoreService.listenToCows((remoteCows) => {
        if (cancelled) return
        setCows((prev) => mergeWithPending(remoteCows, prev, (c) => `cow:${c.id}`))
      }),
      firestoreService.listenToCalvings((remoteCalvings) => {
        if (cancelled) return
        setCalvings((prev) =>
          mergeWithPending(remoteCalvings, prev, (e) => `calving:${e.id}`)
        )
      }),
      firestoreService.listenToPriceSettings((settings) => {
        if (cancelled) return
        if (settings) {
          setPriceSettings(settings)
        } else if (optimisticStore.isPending('settings:price')) {
          // keep optimistic
        } else {
          setPriceSettings(DEFAULT_SETTINGS)
        }
      })
    ]

    ;(async () => {
      try {
        const initial = await firestoreService.getPriceSettings()
        if (!cancelled && initial) setPriceSettings(initial)
      } catch (error) {
        console.error('Falha ao buscar configuracoes de preco', error)
      }
    })()

    return () => {
      cancelled = true
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [authReady, user, dataReady])

  // Android back button handling
  useEffect(() => {
    let backHandler: { remove: () => void } | void

    const register = async () => {
      if (!CapacitorApp?.addListener) return
      backHandler = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (isNoteViewerOpen) {
          closeNoteViewer()
          return
        }

        if (isReceiptViewerOpen) {
          closeReceiptViewer()
          return
        }

        if (location.pathname !== '/') {
          navigate(-1)
          return
        }

        if (isClientModalOpen) {
          setIsClientModalOpen(false)
          return
        }
        if (isSalePickerOpen) {
          setIsSalePickerOpen(false)
          return
        }
        if (isSaleModalOpen) {
          setIsSaleModalOpen(false)
          return
        }
        if (isPayModalOpen) {
          setIsPayModalOpen(false)
          return
        }
        if (isReceiptModalOpen) {
          setIsReceiptModalOpen(false)
          return
        }
        if (clientToDeleteId) {
          setClientToDeleteId(null)
          return
        }
        if (saleToDeleteId) {
          setSaleToDeleteId(null)
          return
        }
        if (paymentToDeleteId) {
          setPaymentToDeleteId(null)
          return
        }

        if (activeTab === 'CLIENTS' && isClientDetailsView) {
          setIsClientDetailsView(false)
          setSelectedClientId(null)
          setResetClientsSignal((n) => n + 1)
          return
        }

        if (activeTab !== 'CLIENTS') {
          setActiveTab('CLIENTS')
          setIsClientDetailsView(false)
          setResetClientsSignal((n) => n + 1)
          return
        }

        if (canGoBack) {
          window.history.back()
          return
        }

        const now = Date.now()
        if (now - lastBackTime < 1500) {
          CapacitorApp.exitApp()
        } else {
          setLastBackTime(now)
          alert('Pressione voltar novamente para sair')
        }
      })
    }

    register()

    return () => {
      backHandler?.remove?.()
    }
  }, [
    activeTab,
    clientToDeleteId,
    isClientDetailsView,
    isClientModalOpen,
    isPayModalOpen,
    isReceiptModalOpen,
    isSaleModalOpen,
    isSalePickerOpen,
    isReceiptViewerOpen,
    isNoteViewerOpen,
    location.pathname,
    navigate,
    lastBackTime, 
    paymentToDeleteId,
    saleToDeleteId,
    closeReceiptViewer,
    closeNoteViewer
  ])

  // Memoized Calculations
  const clientBalances = useMemo(() => {
    const balances = new Map<string, number>()
    clients.forEach((c) => balances.set(c.id, 0))

    sales.forEach((s) => {
      balances.set(s.clientId, (balances.get(s.clientId) || 0) + s.totalValue)
    })

    payments.forEach((p) => {
      balances.set(p.clientId, (balances.get(p.clientId) || 0) - p.amount)
    })

    clients.forEach((c) => {
      const current = balances.get(c.id) || 0
      balances.set(c.id, Math.max(0, current))
    })

    return balances
  }, [clients, sales, payments])

  const currentClientPrice = useMemo(() => {
    const client = clients.find((c) => c.id === selectedClientId)
    if (!client) return priceSettings?.standard ?? 0
    return client.priceType === 'CUSTOM'
      ? priceSettings?.custom ?? 0
      : priceSettings?.standard ?? 0
  }, [clients, selectedClientId, priceSettings])

  const handleResendVerification = async () => {
    try {
      setIsSendingVerification(true)
      await authService.sendEmailVerification()
      alert('Enviamos um novo e-mail de verifica\u00e7\u00e3o (se existir uma conta).')
    } catch (error) {
      console.error('Falha ao reenviar verificacao', error)
      alert('N\u00e3o foi poss\u00edvel reenviar. Tente novamente.')
    } finally {
      setIsSendingVerification(false)
    }
  }

  const handleCheckVerification = async () => {
    try {
      setIsCheckingVerification(true)
      const refreshed = await authService.reloadUser()
      setUser(refreshed)
      if (refreshed?.emailVerified) {
        alert('E-mail verificado com sucesso!')
      } else {
        alert(
          'Ainda n\u00e3o detectamos a verifica\u00e7\u00e3o. Tente novamente ap\u00f3s confirmar o e-mail.'
        )
      }
    } catch (error) {
      console.error('Falha ao checar verificacao', error)
      alert('N\u00e3o foi poss\u00edvel verificar agora. Tente novamente.')
    } finally {
      setIsCheckingVerification(false)
    }
  }

  // --- Modal & Action Handlers ---
  const handleAddClient = () => {
    setEditingClient(null);
    navigate('/clientes/novo');
  }

  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    setEditingClientLoadedUpdatedAt(client.updatedAt ?? 0)
    setIsClientModalOpen(true)
  }

  const handleSaveClient = async (
    name: string,
    phone: string,
    priceType: PriceType,
    avatar?: string
  ) => {
    if (editingClient) {
      try {
        const remote = await firestoreService.getClientById(editingClient.id)
        const remoteUpdatedAt = remote?.updatedAt ?? 0
        if (remoteUpdatedAt > (editingClientLoadedUpdatedAt || 0)) {
          const confirmOverwrite = window.confirm(
            'Esse cliente foi atualizado em outro dispositivo. Deseja sobrescrever mesmo assim?'
          )
          if (!confirmOverwrite) {
            return
          }
        }
      } catch (error) {
        console.error('Falha ao verificar conflito do cliente', error)
      }
    }
    const clientToSave = {
      ...(editingClient || {}),
      id: editingClient?.id || crypto.randomUUID(),
      name,
      phone,
      priceType,
      ...(avatar && { avatar })
    }
    await offlineWrites.saveClient(clientToSave as Client)
    setEditingClient(null)
    setEditingClientLoadedUpdatedAt(0)
    setIsClientModalOpen(false)
  }

  const handleAddSale = (clientId: string) => {
    setSelectedClientId(clientId)
    setIsSaleModalOpen(true)
  }

  const handleSaveSale = async (
    liters: number,
    date: string,
    pricePerLiter: number,
    paymentStatus: PaymentStatus
  ) => {
    if (!selectedClientId) return

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

    const saleId = crypto.randomUUID()
    const saleDate = toDateTime(date)
    const totalValue = liters * pricePerLiter
    const client = clients.find((c) => c.id === selectedClientId)

    const newSale: Sale = {
      id: saleId,
      clientId: selectedClientId,
      date: saleDate,
      liters,
      pricePerLiter,
      totalValue,
      paymentStatus,
      isPaid: paymentStatus === 'AVISTA'
    }

    await offlineWrites.saveSale(newSale)

    if (paymentStatus === 'AVISTA') {
      const payment: Payment = {
        id: crypto.randomUUID(),
        clientId: selectedClientId,
        clientName: client?.name || 'Cliente',
        saleId,
        amount: totalValue,
        date: saleDate,
        note: 'Pagamento automatico (a vista)',
        salesSnapshot: [newSale]
      }
      await offlineWrites.savePayment(payment, [newSale])
    }

    setIsSaleModalOpen(false)
    setSelectedClientId(null)
  }

  const handlePayDebt = (clientId: string) => {
    setSelectedClientId(clientId)
    setIsPayModalOpen(true)
  }

  const handleOpenNotePreview = (clientId: string) => {
    setSelectedClientId(clientId)
    navigate(`/clientes/${clientId}/nota`)
  }

  const getValidPaymentDate = (value?: string) => {
    if (!value) return new Date()
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed
  }

  const handleConfirmPayDebt = async (paidAmount: number, paidAt?: string) => {
    if (!selectedClientId) return
    const client = clients.find((c) => c.id === selectedClientId)
    const balance = Math.max(0, clientBalances.get(selectedClientId) || 0)
    if (balance <= 0 || !client) return

    const amount = Math.min(paidAmount, balance)
    if (amount <= 0) return

    const currentDate = getValidPaymentDate(paidAt).toISOString()
    const unpaidSales = sales.filter(
      (s) => s.clientId === selectedClientId && !s.isPaid
    )
    const shouldClearAll = amount >= balance
    const salesToBePaid = shouldClearAll ? unpaidSales : []
    const newPayment: Payment = {
      id: crypto.randomUUID(),
      clientId: selectedClientId,
      clientName: client.name,
      amount,
      date: currentDate,
      salesSnapshot: unpaidSales
    }
    await offlineWrites.savePayment(newPayment, salesToBePaid)

    setLastPaymentInfo({
      clientName: client.name,
      amount,
      sales: salesToBePaid,
      date: currentDate
    })
    setIsReceiptModalOpen(true)
    setIsPayModalOpen(false)
    setSelectedClientId(null)
  }

  const resolvePdfBlob = useCallback(async (file: ReceiptFileRef | null) => {
    if (!file) return null
    if (file.blob) return file.blob
    if (file.base64) return base64ToBlob(file.base64, file.mimeType)
    if (file.uri) {
      const res = await fetch(file.uri)
      return await res.blob()
    }
    return null
  }, [])

  const handleGenerateReceipt = async (payment?: Payment) => {
    const info = payment
      ? {
          clientName: payment.clientName,
          amount: payment.amount,
          sales: payment.salesSnapshot || [],
          date: payment.date
        }
      : lastPaymentInfo
    if (!info) {
      alert('N\u00e3o h\u00e1 informa\u00e7\u00f5es para gerar o recibo.')
      return
    }

    try {
      revokePdfObjectUrl(receiptUrl)
      const file = await createReceiptFile(info.clientName, info.amount, info.sales, info.date)
      const blob = await resolvePdfBlob(file)
      if (!blob) {
        throw new Error('Blob do comprovante n\u00e3o gerado')
      }

      if (file.source === 'web') {
        revokePdfObjectUrl(file.uri)
      }

      const url = URL.createObjectURL(blob)
      setReceiptFile(file)
      setReceiptBlob(blob)
      setReceiptUrl(url)
      setReceiptShareInfo({
        clientName: info.clientName,
        amount: info.amount,
        date: info.date
      })
      setIsReceiptViewerOpen(true)
      if (!payment) setIsReceiptModalOpen(false)
    } catch (err) {
      console.error('Falha ao gerar comprovante', err)
      alert('N\u00e3o foi poss\u00edvel gerar o comprovante.')
    }
  }

  const shareReceipt = useCallback(async () => {
    if (!receiptFile) return

    const fileName = receiptFile.fileName || 'comprovante.pdf'
    const mimeType = receiptFile.mimeType || 'application/pdf'
    const shareText = receiptShareInfo?.clientName
      ? `Comprovante de ${receiptShareInfo.clientName}`
      : 'Comprovante de pagamento'

    try {
      if (Capacitor.isNativePlatform?.() && receiptFile.uri) {
        try {
          await Share.share({
            title: 'Comprovante de Pagamento',
            text: shareText,
            url: receiptFile.uri,
            dialogTitle: 'Compartilhar PDF'
          })
          return
        } catch (nativeError) {
          console.warn('Falha ao compartilhar nativamente, tentando fallback', nativeError)
        }
      }

      const blob = receiptBlob ?? (await resolvePdfBlob(receiptFile))

      if (typeof navigator !== 'undefined' && navigator.share) {
        const shareData: ShareData = {
          title: 'Comprovante',
          text: shareText
        }
        if (blob) {
          const fileForShare = new File([blob], fileName, { type: mimeType })
          const navAny = navigator as any
          if (!navAny.canShare || navAny.canShare({ files: [fileForShare] })) {
            ;(shareData as any).files = [fileForShare]
          } else if (receiptUrl) {
            ;(shareData as any).url = receiptUrl
          }
        } else if (receiptUrl) {
          ;(shareData as any).url = receiptUrl
        }
        await navigator.share(shareData)
        return
      }

      const downloadUrl = receiptUrl || receiptFile.uri
      if (downloadUrl) {
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = fileName
        link.target = '_blank'
        link.rel = 'noopener'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        return
      }

      alert('N\u00e3o foi poss\u00edvel compartilhar o comprovante.')
    } catch (error) {
      console.error('Falha ao compartilhar comprovante', error)
      alert('N\u00e3o foi poss\u00edvel compartilhar o comprovante.')
    }
  }, [receiptFile, receiptShareInfo, receiptBlob, receiptUrl, resolvePdfBlob])

  const handleNotePdfReady = useCallback(
    async (payload: {
      file: ReceiptFileRef
      clientName: string
      periodLabel: string
      balance: number
    }) => {
      try {
        revokePdfObjectUrl(noteUrl)
        const blob = await resolvePdfBlob(payload.file)
        if (!blob) {
          throw new Error('Blob da nota n\u00e3o gerado')
        }
        if (payload.file.source === 'web') {
          revokePdfObjectUrl(payload.file.uri)
        }
        const url = URL.createObjectURL(blob)
        setNoteFile(payload.file)
        setNoteBlob(blob)
        setNoteUrl(url)
        setNoteShareInfo({
          clientName: payload.clientName,
          periodLabel: payload.periodLabel,
          balance: payload.balance
        })
        setIsNoteViewerOpen(true)
      } catch (error) {
        console.error('Falha ao preparar nota', error)
        alert('N\u00e3o foi poss\u00edvel abrir a nota.')
      }
    },
    [noteUrl, resolvePdfBlob, revokePdfObjectUrl]
  )

  const shareNote = useCallback(async () => {
    if (!noteFile) return

    const fileName = noteFile.fileName || 'nota.pdf'
    const mimeType = noteFile.mimeType || 'application/pdf'
    const shareText = noteShareInfo?.clientName
      ? `Nota de pagamento - ${noteShareInfo.clientName}`
      : 'Nota de pagamento'

    try {
      if (Capacitor.isNativePlatform?.() && noteFile.uri) {
        try {
          await Share.share({
            title: 'Nota de pagamento',
            text: shareText,
            url: noteFile.uri,
            dialogTitle: 'Compartilhar PDF'
          })
          return
        } catch (nativeError) {
          console.warn('Falha ao compartilhar nota nativamente, tentando fallback', nativeError)
        }
      }

      const blob = noteBlob ?? (await resolvePdfBlob(noteFile))

      if (typeof navigator !== 'undefined' && navigator.share) {
        const shareData: ShareData = {
          title: 'Nota de pagamento',
          text: shareText
        }
        if (blob) {
          const fileForShare = new File([blob], fileName, { type: mimeType })
          const navAny = navigator as any
          if (!navAny.canShare || navAny.canShare({ files: [fileForShare] })) {
            ;(shareData as any).files = [fileForShare]
          } else if (noteUrl) {
            ;(shareData as any).url = noteUrl
          }
        } else if (noteUrl) {
          ;(shareData as any).url = noteUrl
        }
        await navigator.share(shareData)
        return
      }

      const downloadUrl = noteUrl || noteFile.uri
      if (downloadUrl) {
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = fileName
        link.target = '_blank'
        link.rel = 'noopener'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        return
      }

      alert('N\u00e3o foi poss\u00edvel compartilhar a nota.')
    } catch (error) {
      console.error('Falha ao compartilhar nota', error)
      alert('N\u00e3o foi poss\u00edvel compartilhar a nota.')
    }
  }, [noteFile, noteShareInfo, noteBlob, noteUrl, resolvePdfBlob])
  // --- Deletion Handlers exposed to pages ---
  const confirmDeleteClient = async () => {
    if (!clientToDeleteId) return
    await offlineWrites.deleteClient(clientToDeleteId)
    setClientToDeleteId(null)
  }

  const confirmDeleteSale = async () => {
    if (!saleToDeleteId) return
    await offlineWrites.deleteSale(saleToDeleteId)
    setSaleToDeleteId(null)
  }

  const confirmDeletePayment = async () => {
    if (!paymentToDeleteId) return
    await offlineWrites.deletePayment(paymentToDeleteId)
    setPaymentToDeleteId(null)
  }

  const renderVerificationBanner = () => {
    if (!user || user.emailVerified || user.isAnonymous) return null
    return (
      <div className='mx-4 mt-3 mb-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-950 px-4 py-3 flex flex-col gap-2'>
        <div className='flex items-center justify-between gap-2'>
          <p className='text-sm font-semibold'>{'E-mail n\u00e3o verificado'}</p>
          <span className='text-xs text-amber-900'>
            {user.email || 'Sem e-mail'}
          </span>
        </div>
        <p className='text-xs text-amber-900'>
          {'Verifique seu e-mail para liberar todos os recursos.'}
        </p>
        <div className='flex flex-wrap gap-2'>
          <button
            onClick={handleResendVerification}
            disabled={isSendingVerification}
            className='px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/30 border border-amber-400/50 text-amber-950 disabled:opacity-60'
          >
            {isSendingVerification ? 'Enviando...' : 'Reenviar verifica\u00e7\u00e3o'}
          </button>
          <button
            onClick={handleCheckVerification}
            disabled={isCheckingVerification}
            className='px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 border border-slate-600 text-slate-900 disabled:opacity-60'
          >
            {isCheckingVerification ? 'Checando...' : 'J\u00e1 verifiquei'}
          </button>
        </div>
      </div>
    )
  }

  const showTab = (tab: TabState, date?: Date) => {
    if (tab === 'REPORTS') setReportsStart(date)
    setActiveTab(tab)
    setIsClientDetailsView(false)
    if (tab === 'CLIENTS') {
      setSelectedClientId(null)
      setResetClientsSignal((signal) => signal + 1)
    }
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  // --- Render Logic ---
  const renderActivePage = () => {
    switch (activeTab) {
      case 'DASHBOARD':
        return (
          <DashboardPage
            clients={clients}
            sales={sales}
            clientBalances={clientBalances}
            priceSettings={priceSettings}
            onShowClients={() => showTab('CLIENTS')}
            onShowPayments={() => showTab('PAYMENTS')}
            onShowReports={(date) => showTab('REPORTS', date)}
            onShowSettings={() => showTab('SETTINGS')}
          />
        )
      case 'CLIENTS':
        return (
          <ClientsPage
            clients={clients}
            sales={sales}
            payments={payments}
            clientBalances={clientBalances}
            priceSettings={priceSettings}
            resetToListSignal={resetClientsSignal}
            onAddClient={handleAddClient}
            onEditClient={handleEditClient}
            onAddSale={handleAddSale}
            onPayDebt={handlePayDebt}
            onGenerateNote={handleOpenNotePreview}
            onDeleteClient={setClientToDeleteId}
            onDeleteSale={setSaleToDeleteId}
            onDeletePayment={setPaymentToDeleteId}
            onDetailsViewChange={setIsClientDetailsView}
          />
        )
      case 'REPORTS':
        return <ReportsPage sales={sales} payments={payments} clients={clients} initialDate={reportsStart} />
      case 'REPRODUCTION':
        return <ReproductionPage cows={cows} calvings={calvings} />
      case 'SETTINGS':
        return (
          <SettingsPage
            priceSettings={priceSettings}
            onSavePriceSettings={async (next) => {
              const fs: any = firestoreService as any
              try {
                await offlineWrites.savePriceSettings(next)
                setPriceSettings(next)
              } catch (error) {
                console.error('Falha ao buscar configuracoes de preco', error)
                throw error
              }
            }}
            currentUserEmail={user?.email ?? undefined}
            currentUserId={user?.uid}
            currentUserIsAnonymous={user?.isAnonymous}
            onSignOut={() => authService.signOut()}
            onOpenPendingModal={() => setIsPendingModalOpen(true)}
          />
        )
      case 'PAYMENTS':
        return (
          <PaymentsPage
            payments={payments}
            sales={sales}
            clients={clients}
            clientBalances={clientBalances}
            onGenerateReceipt={handleGenerateReceipt}
            onDeletePayment={setPaymentToDeleteId}
            onPayDebt={handlePayDebt}
          />
        )
      default:
        return null
    }
  }

  if (!authReady) {
    return (
      <div data-theme='flat-lime' className='min-h-screen flex items-center justify-center'>
        <span className='animate-pulse text-slate-300'>Carregando...</span>
      </div>
    )
  }

  if (!user) {
    return <div data-theme='flat-lime'><AuthPage /></div>
  }

  if (!dataReady && !dataError) {
    return (
      <div data-theme='flat-lime' className='min-h-screen flex items-center justify-center'>
        <span className='animate-pulse text-slate-300'>
          Preparando sua conta...
        </span>
      </div>
    )
  }

  if (dataError) {
    return (
      <div data-theme='flat-lime' className='min-h-screen flex items-center justify-center px-6 text-center space-y-4'>
        <div className='space-y-2'>
          <h1 className='text-xl font-bold'>Erro ao preparar conta</h1>
          <p className='text-slate-300 text-sm'>{dataError}</p>
        </div>
        <button
          onClick={() => {
            setDataError(null)
            setRetryTick((n) => n + 1)
          }}
          className='agro-primary-button'
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  // Main content renderer (Tabs)
  const mainContent = (
    <>
      <WorkspaceShell
        tab={activeTab}
        onNavigate={showTab}
        onNewSale={() => setIsSalePickerOpen(true)}
        status={<SyncStatusPill />}
        banner={renderVerificationBanner()}
      >
        <div className={activeTab === 'REPORTS' || activeTab === 'REPRODUCTION' || activeTab === 'SETTINGS' ? 'py-4' : undefined}>
          {renderActivePage()}
        </div>
      </WorkspaceShell>

      {isSalePickerOpen && (
        <SaleClientPicker
          clients={clients}
          onClose={() => setIsSalePickerOpen(false)}
          onSelect={handleAddSale}
          onAddClient={handleAddClient}
        />
      )}

      {/* --- Modals --- */}
      <AddClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSave={handleSaveClient}
        initialData={editingClient}
        existingNames={clients.map((c) => c.name)}
        priceSettings={priceSettings}
      />
      <AddSaleModal
        isOpen={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        onSave={handleSaveSale}
        currentPrice={currentClientPrice}
        clientName={clients.find((client) => client.id === selectedClientId)?.name}
      />
      <PayDebtModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        onConfirm={handleConfirmPayDebt}
        clientName={clients.find((c) => c.id === selectedClientId)?.name || ''}
        clientAvatar={clients.find((c) => c.id === selectedClientId)?.avatar}
        totalValue={
          selectedClientId ? clientBalances.get(selectedClientId) || 0 : 0
        }
      />
      <SuccessReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onGenerate={() => handleGenerateReceipt()}
        clientName={lastPaymentInfo?.clientName || ''}
      />

      <ConfirmModal
        isOpen={!!clientToDeleteId}
        onClose={() => setClientToDeleteId(null)}
        onConfirm={confirmDeleteClient}
        title='Excluir Cliente'
        message='Tem certeza? Todo o historico de vendas e pagamentos sera perdido.'
        isDanger
      />
      <ConfirmModal
        isOpen={!!saleToDeleteId}
        onClose={() => setSaleToDeleteId(null)}
        onConfirm={confirmDeleteSale}
        title='Excluir Venda'
        message='Deseja remover este registro de venda?'
        isDanger
      />
      <ConfirmModal
        isOpen={!!paymentToDeleteId}
        onClose={() => setPaymentToDeleteId(null)}
        onConfirm={confirmDeletePayment}
        title='Excluir Pagamento'
        message='Deseja remover este registro de pagamento?'
        isDanger
      />

      <ReceiptViewer
        open={isReceiptViewerOpen}
        pdfUrl={receiptUrl}
        onClose={closeReceiptViewer}
        onShare={shareReceipt}
      />
      <ReceiptViewer
        open={isNoteViewerOpen}
        pdfUrl={noteUrl}
        onClose={closeNoteViewer}
        onShare={shareNote}
        title='Nota de pagamento'
        documentLabel='nota'
      />
      <PendingQueueModal
        open={isPendingModalOpen}
        onClose={() => setIsPendingModalOpen(false)}
      />
    </>
  )

  const showNewClientSheet = location.pathname === '/clientes/novo'
  const notePreviewMatch = location.pathname.match(/^\/clientes\/([^/]+)\/nota/)
  const notePreviewClientId = notePreviewMatch?.[1] || null

  return (
    <div data-theme='flat-lime' className='min-h-screen font-sans'>
      {mainContent}
      {showNewClientSheet && (
        <NewClientPage
          onSave={handleSaveClient}
          priceSettings={priceSettings}
          existingNames={clients.map((client) => client.name)}
        />
      )}
      {notePreviewClientId && (
        <CustomerNotePreviewPage
          clientId={notePreviewClientId}
          clients={clients}
          sales={sales}
          payments={payments}
          onClose={() => navigate(-1)}
          onPdfReady={handleNotePdfReady}
          priceSettings={priceSettings}
        />
      )}
    </div>
  )
}

export default App
