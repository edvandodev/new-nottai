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

const DEFAULT_SETTINGS: PriceSettings = {
  standard: 0,
  custom: 0
}

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
    const unsubscribers = [
      firestoreService.listenToClients(setClients),
      firestoreService.listenToSales(setSales),
      firestoreService.listenToPayments(setPayments),
      firestoreService.listenToPriceSettings((settings) => {
        if (settings) setPriceSettings(settings)
      })
    ]
    return () => unsubscribers.forEach((unsub) => unsub())
  }, [])

  // Memoized Calculations
  const clientBalances = useMemo(() => {
    const balances = new Map<string, number>()
    clients.forEach((c) => balances.set(c.id, 0))
    sales.forEach((s) =>
      balances.set(s.clientId, (balances.get(s.clientId) || 0) + s.totalValue)
    )
    payments.forEach((p) =>
      balances.set(p.clientId, (balances.get(p.clientId) || 0) - p.amount)
    )
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
    const newSale: Sale = {
      id: crypto.randomUUID(),
      clientId: selectedClientId,
      date,
      liters,
      totalValue: liters * currentClientPrice
    }
    await firestoreService.saveSale(newSale)
    setIsSaleModalOpen(false)
    setSelectedClientId(null)
  }

  const handlePayDebt = (clientId: string) => {
    setSelectedClientId(clientId)
    setIsPayModalOpen(true)
  }

  const handleConfirmPayDebt = async () => {
    if (!selectedClientId) return
    const client = clients.find((c) => c.id === selectedClientId)
    const amount = clientBalances.get(selectedClientId) || 0
    if (amount <= 0 || !client) return

    const currentDate = new Date().toISOString()
    const salesToBePaid = sales.filter(
      (s) => s.clientId === selectedClientId && !s.isPaid
    )
    const newPayment: Payment = {
      id: crypto.randomUUID(),
      clientId: selectedClientId,
      clientName: client.name,
      amount,
      date: currentDate,
      salesSnapshot: salesToBePaid
    }
    await firestoreService.savePayment(
      newPayment,
      salesToBePaid.map((s) => s.id)
    )

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
        return <ReportsPage sales={sales} payments={payments} />
      case 'SETTINGS':
        return (
          <SettingsPage
            priceSettings={priceSettings}
            onSavePriceSettings={async (next) => {
              // Não altera config: evita quebrar build se o type do firestoreService não tiver esse método.
              const fs: any = firestoreService as any
              if (typeof fs.savePriceSettings === 'function') {
                await fs.savePriceSettings(next)
                return
              }
              if (typeof fs.setPriceSettings === 'function') {
                await fs.setPriceSettings(next)
                return
              }
              console.warn(
                'Nenhum método de salvar preço encontrado em firestoreService (savePriceSettings/setPriceSettings).'
              )
              alert(
                'Não encontrei um método para salvar as configurações de preço no firestoreService.'
              )
            }}
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
      default:
        return ''
    }
  }, [activeTab])

  const renderHeader = () => {
    // Layout original: some quando está em detalhes do cliente.
    if (activeTab === 'CLIENTS' && isClientDetailsView) return null

    return (
      <header className='sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 shadow-md'>
        <div className='max-w-2xl mx-auto px-4 h-16 flex items-center justify-between'>
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
