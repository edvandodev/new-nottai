import React, { useEffect, useMemo, useState } from 'react'
import { firestoreService } from './services/firestore'
import {
  Client,
  Sale,
  Payment,
  PriceSettings,
  PriceType,
  TabState
} from './types'
import {
  AddClientModal,
  AddSaleModal,
  PayDebtModal,
  ConfirmModal,
  SuccessReceiptModal
} from './components/Modals'
import { generateReceipt } from './services/pdfGenerator'
import { Milk, Settings as SettingsIcon, TrendingUp, Users } from 'lucide-react'

// Import Pages
import { ClientsPage } from './pages/clients'
import { ReportsPage } from './pages/reports'
import { SettingsPage } from './pages/settings'
import { PaymentsPage } from './pages/payments'

const DEFAULT_SETTINGS: PriceSettings = {
  standard: 0,
  custom: 0
}

const CustomPaymentIcon = ({
  size = 20,
  className = ''
}: {
  size?: number
  className?: string
}) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 512 512'
    xmlns='http://www.w3.org/2000/svg'
    className={className}
    fill='currentColor'
  >
    <g>
      <path d='m480.892 274.582c-18.896-6.396-38.938-.29-51.058 15.558l-55.864 73.053c.009-.398.03-.793.03-1.193 0-27.57-22.43-50-50-50h-99.231c-31.637-26.915-76.35-31.705-112.769-12.853v-2.147c0-8.284-6.716-15-15-15h-82c-8.284 0-15 6.716-15 15v200c0 8.284 6.716 15 15 15h82c8.284 0 15-6.716 15-15v-15h245.864c35.896 0 68.913-18.026 88.324-48.221l58.538-91.06c4.759-7.401 7.273-15.964 7.273-24.764.001-19.95-12.21-36.976-31.107-43.373zm-398.892 207.418h-52v-170h52zm397.491-155.504-58.539 91.061c-13.864 21.567-37.448 34.443-63.088 34.443h-245.864v-117.281l5.017-3.583c28.141-20.101 66.657-17.293 91.587 6.677 2.794 2.687 6.52 4.188 10.396 4.188h105c11.028 0 20 8.972 20 20s-8.972 20-20 20h-105-2c-8.284 0-15 6.716-15 15s6.716 15 15 15h2 105 13.35c23.208 0 45.479-11.006 59.576-29.441l56.738-74.195c6.385-8.348 15.09-6.217 17.608-5.365 2.517.853 10.728 4.449 10.728 14.958 0 3.033-.867 5.985-2.509 8.538z' />
      <path d='m262.055 179.712c9.488 6.207 16.181 8.388 24.255 9.086v6.202c0 5.522 4.478 10 10 10s10-4.478 10-10v-7.162c16.616-4.215 27.266-18.408 29.619-32.403 3.026-18.005-6.751-34.277-24.329-40.491-1.741-.615-3.515-1.255-5.29-1.914v-32.311c3.055 1.126 4.645 2.657 4.872 2.888 3.638 4.104 9.909 4.514 14.051.905 4.164-3.627 4.6-9.944.972-14.108-3.323-3.815-10.186-8.595-19.895-10.276v-5.128c0-5.522-4.478-10-10-10s-10 4.478-10 10v6.224c-.616.163-1.238.336-1.865.525-11.853 3.57-20.705 13.689-23.102 26.407-2.199 11.671 1.59 22.963 9.889 29.472 3.917 3.073 8.691 5.889 15.078 8.817v42.231c-4.52-.635-7.905-2.167-13.306-5.7-4.622-3.026-10.82-1.727-13.843 2.894s-1.728 10.818 2.894 13.842zm44.255-45.373c10.822 4.558 10.552 13.873 9.896 17.781-.911 5.42-4.271 11.118-9.896 14.339zm-22.736-32.447c-2.365-1.854-3.376-5.792-2.577-10.031.579-3.073 2.261-6.615 5.312-8.956v20.913c-.984-.631-1.902-1.273-2.735-1.926z' />
      <path d='m297 250c68.925 0 125-56.075 125-125s-56.075-125-125-125-125 56.075-125 125 56.075 125 125 125zm0-220c52.383 0 95 42.617 95 95s-42.617 95-95 95-95-42.617-95-95 42.617-95 95-95z' />
    </g>
  </svg>
)

function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<TabState>('CLIENTS')
  const [isClientDetailsView, setIsClientDetailsView] = useState(false)

  // Data State
  const [clients, setClients] = useState<Client[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [priceSettings, setPriceSettings] =
    useState<PriceSettings>(DEFAULT_SETTINGS)

  // UI State
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null) // For modals

  // Modal State
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false)
  const [isPayModalOpen, setIsPayModalOpen] = useState(false)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)

  // Deletion and Confirmation State
  const [clientToDeleteId, setClientToDeleteId] = useState<string | null>(null)
  const [saleToDeleteId, setSaleToDeleteId] = useState<string | null>(null)
  const [paymentToDeleteId, setPaymentToDeleteId] = useState<string | null>(
    null
  )

  const [lastPaymentInfo, setLastPaymentInfo] = useState<{
    clientName: string
    amount: number
    sales: Sale[]
    date: string
  } | null>(null)

  // Firestore Listeners
  useEffect(() => {
    let cancelled = false
    const unsubscribers = [
      firestoreService.listenToClients(setClients),
      firestoreService.listenToSales(setSales),
      firestoreService.listenToPayments(setPayments),
      firestoreService.listenToPriceSettings((settings) => {
        if (!cancelled && settings) setPriceSettings(settings)
      })
    ]

    ;(async () => {
      try {
        const initial = await firestoreService.getPriceSettings()
        if (!cancelled && initial) setPriceSettings(initial)
      } catch (error) {
        console.error('Falha ao buscar configurações de preço', error)
      }
    })()

    return () => {
      cancelled = true
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [])

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

  // --- Modal & Action Handlers ---
  const handleAddClient = () => {
    setEditingClient(null)
    setIsClientModalOpen(true)
  }

  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    setIsClientModalOpen(true)
  }

  const handleSaveClient = async (
    name: string,
    phone: string,
    priceType: PriceType,
    avatar?: string
  ) => {
    const clientToSave = {
      ...(editingClient || {}),
      id: editingClient?.id || crypto.randomUUID(),
      name,
      phone,
      priceType,
      ...(avatar && { avatar })
    }
    await firestoreService.saveClient(clientToSave as Client)
    setEditingClient(null)
    setIsClientModalOpen(false)
  }

  const handleAddSale = (clientId: string) => {
    setSelectedClientId(clientId)
    setIsSaleModalOpen(true)
  }

  const handleSaveSale = async (liters: number, date: string) => {
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

    const newSale: Sale = {
      id: crypto.randomUUID(),
      clientId: selectedClientId,
      date: toDateTime(date),
      liters,
      totalValue: liters * currentClientPrice,
      isPaid: false
    }
    await firestoreService.saveSale(newSale)
    setIsSaleModalOpen(false)
    setSelectedClientId(null)
  }

  const handlePayDebt = (clientId: string) => {
    setSelectedClientId(clientId)
    setIsPayModalOpen(true)
  }

  const handleConfirmPayDebt = async (paidAmount: number) => {
    if (!selectedClientId) return
    const client = clients.find((c) => c.id === selectedClientId)
    const balance = Math.max(0, clientBalances.get(selectedClientId) || 0)
    if (balance <= 0 || !client) return

    const amount = Math.min(paidAmount, balance)
    if (amount <= 0) return

    const currentDate = new Date().toISOString()
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
    await firestoreService.savePayment(newPayment, salesToBePaid)

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

  const handleGenerateReceipt = (payment?: Payment) => {
    const info = payment
      ? {
          clientName: payment.clientName,
          amount: payment.amount,
          sales: payment.salesSnapshot || [],
          date: payment.date
        }
      : lastPaymentInfo
    if (info) {
      generateReceipt(info.clientName, info.amount, info.sales, info.date)
      if (!payment) setIsReceiptModalOpen(false)
    } else alert('Não há informações para gerar o recibo.')
  }

  // --- Deletion Handlers exposed to pages ---
  const confirmDeleteClient = async () => {
    if (!clientToDeleteId) return
    await firestoreService.deleteClient(clientToDeleteId)
    setClientToDeleteId(null)
  }

  const confirmDeleteSale = async () => {
    if (!saleToDeleteId) return
    await firestoreService.deleteSale(saleToDeleteId)
    setSaleToDeleteId(null)
  }

  const confirmDeletePayment = async () => {
    if (!paymentToDeleteId) return
    await firestoreService.deletePayment(paymentToDeleteId)
    setPaymentToDeleteId(null)
  }

  // --- Render Logic ---
  const renderActivePage = () => {
    switch (activeTab) {
      case 'CLIENTS':
        return (
          <ClientsPage
            clients={clients}
            sales={sales}
            payments={payments}
            clientBalances={clientBalances}
            priceSettings={priceSettings}
            onAddClient={handleAddClient}
            onEditClient={handleEditClient}
            onAddSale={handleAddSale}
            onPayDebt={handlePayDebt}
            onDeleteClient={setClientToDeleteId}
            onDeleteSale={setSaleToDeleteId}
            onDeletePayment={setPaymentToDeleteId}
            onDetailsViewChange={setIsClientDetailsView}
          />
        )
      case 'REPORTS':
        return <ReportsPage sales={sales} payments={payments} clients={clients} />
      case 'SETTINGS':
        return (
          <SettingsPage
            priceSettings={priceSettings}
            onSavePriceSettings={async (next) => {
              const fs: any = firestoreService as any
              try {
                if (typeof fs.savePriceSettings === 'function') {
                  await fs.savePriceSettings(next)
                } else if (typeof fs.setPriceSettings === 'function') {
                  await fs.setPriceSettings(next)
                } else {
                  console.warn(
                    'Nenhum metodo de salvar preco encontrado em firestoreService (savePriceSettings/setPriceSettings).'
                  )
                  alert(
                    'Nao encontrei um metodo para salvar as configuracoes de preco no firestoreService.'
                  )
                  return
                }
                setPriceSettings(next)
              } catch (error) {
                console.error('Falha ao salvar configuracoes de preco', error)
                throw error
              }
            }}
          />
        )
      case 'PAYMENTS':
        return (
          <PaymentsPage
            payments={payments}
            onGenerateReceipt={handleGenerateReceipt}
            onDeletePayment={setPaymentToDeleteId}
          />
        )
      default:
        return null
    }
  }

  const tabTitle = useMemo(() => {
    switch (activeTab) {
      case 'CLIENTS':
        return 'Meus Clientes'
      case 'REPORTS':
        return 'Relatórios'
      case 'SETTINGS':
        return 'Ajustes'
      case 'PAYMENTS':
        return 'Histórico'
      default:
        return ''
    }
  }, [activeTab])

  const renderHeader = () => {
    // Layout original: some quando está em detalhes do cliente.
    if (activeTab === 'CLIENTS' && isClientDetailsView) return null

    return (
      <header
        className='sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 shadow-md'
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className='max-w-2xl mx-auto px-4 h-16 flex items-center justify-between pt-[env(safe-area-inset-top,0px)]'>
          <div className='flex items-center gap-3'>
            <div className='bg-blue-600 p-2 rounded-lg'>
              <Milk size={24} className='text-white' />
            </div>
            <h1 className='text-xl font-bold tracking-tight text-white'>
              {tabTitle}
            </h1>
          </div>
        </div>
      </header>
    )
  }

  const navItemBase =
    'relative flex flex-col items-center justify-center w-16 h-16 transition-all duration-300 group'
  const navIndicator =
    'absolute -top-2 w-8 h-1 bg-blue-500 rounded-b-full shadow-[0_2px_10px_rgba(59,130,246,0.6)] animate-fade-in'
  const navActive = 'text-blue-400'
  const navInactive = 'text-slate-500 hover:text-slate-300'

  const renderBottomNav = () => (
    <div className='fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)] px-2 pb-6 pt-2'>
      <div className='flex justify-around items-center max-w-lg mx-auto w-full'>
        <button
          onClick={() => {
            setActiveTab('CLIENTS')
            setIsClientDetailsView(false)
            setSelectedClientId(null)
          }}
          className={`${navItemBase} ${
            activeTab === 'CLIENTS' ? navActive : navInactive
          }`}
        >
          {activeTab === 'CLIENTS' && <span className={navIndicator} />}
          <Users
            size={24}
            strokeWidth={activeTab === 'CLIENTS' ? 2.5 : 1.5}
            className='mb-1 transition-transform group-active:scale-90'
          />
          <span className='text-[10px] font-medium tracking-wide'>
            Clientes
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('PAYMENTS')
            setIsClientDetailsView(false)
          }}
          className={`${navItemBase} ${
            activeTab === 'PAYMENTS' ? navActive : navInactive
          }`}
        >
          {activeTab === 'PAYMENTS' && <span className={navIndicator} />}
          <CustomPaymentIcon
            size={24}
            className='mb-1 transition-transform group-active:scale-90'
          />
          <span className='text-[10px] font-medium tracking-wide'>
            Pagamentos
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('REPORTS')
            setIsClientDetailsView(false)
          }}
          className={`${navItemBase} ${
            activeTab === 'REPORTS' ? navActive : navInactive
          }`}
        >
          {activeTab === 'REPORTS' && <span className={navIndicator} />}
          <TrendingUp
            size={24}
            strokeWidth={activeTab === 'REPORTS' ? 2.5 : 1.5}
            className='mb-1 transition-transform group-active:scale-90'
          />
          <span className='text-[10px] font-medium tracking-wide'>
            Relatórios
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('SETTINGS')
            setIsClientDetailsView(false)
          }}
          className={`${navItemBase} ${
            activeTab === 'SETTINGS' ? navActive : navInactive
          }`}
        >
          {activeTab === 'SETTINGS' && <span className={navIndicator} />}
          <SettingsIcon
            size={24}
            strokeWidth={activeTab === 'SETTINGS' ? 2.5 : 1.5}
            className='mb-1 transition-transform group-active:scale-90'
          />
          <span className='text-[10px] font-medium tracking-wide'>Ajustes</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className='min-h-screen bg-slate-950 text-slate-100 font-sans pb-32'>
      {renderHeader()}
      <main
        className={`max-w-2xl mx-auto ${
          activeTab === 'CLIENTS' && isClientDetailsView ? 'p-0' : 'p-4'
        }`}
      >
        {renderActivePage()}
      </main>

      {renderBottomNav()}

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
      />
      <PayDebtModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        onConfirm={handleConfirmPayDebt}
        clientName={clients.find((c) => c.id === selectedClientId)?.name || ''}
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
        message='Tem certeza? Todo o histórico de vendas e pagamentos será perdido.'
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
    </div>
  )
}

export default App
