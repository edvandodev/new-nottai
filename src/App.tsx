import React, { useState, useEffect, useMemo } from 'react'
import { firestoreService } from '@/services/firestore'
import {
  Client,
  Sale,
  Payment,
  ViewState,
  TabState,
  DEFAULT_SETTINGS,
  PriceSettings,
  PriceType
} from '@/types'
import {
  AddClientModal,
  AddSaleModal,
  PayDebtModal,
  ConfirmModal,
  SuccessReceiptModal
} from '@/components/Modals'
import { generateReceipt } from '@/services/pdfGenerator'

function App() {
  console.log('[DEBUG] App.tsx: Componente App renderizado.');

  const [activeTab, setActiveTab] = useState<TabState>('CLIENTS')
  const [clientView, setClientView] = useState<ViewState>('LIST')

  const [clients, setClients] = useState<Client[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [priceSettings, setPriceSettings] =
    useState<PriceSettings>(DEFAULT_SETTINGS)

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)

  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [standardPriceInput, setStandardPriceInput] = useState('')
  const [customPriceInput, setCustomPriceInput] = useState('')

  const [lastPaymentInfo, setLastPaymentInfo] = useState<{
    clientName: string
    amount: number
    sales: Sale[]
    date: string
  } | null>(null)

  const [clientToDeleteId, setClientToDeleteId] = useState<string | null>(null)
  const [saleToDeleteId, setSaleToDeleteId] = useState<string | null>(null)
  const [paymentToDeleteId, setPaymentToDeleteId] = useState<string | null>(
    null
  )

  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false)
  const [isPayModalOpen, setIsPayModalOpen] = useState(false)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)

  useEffect(() => {
    console.log('[DEBUG] App.tsx: useEffect principal executado.');
    const unsubscribeClients = firestoreService.listenToClients(setClients)
    const unsubscribeSales = firestoreService.listenToSales(setSales)
    const unsubscribePayments = firestoreService.listenToPayments(setPayments)

    const unsubscribeSettings = firestoreService.listenToPriceSettings(
      (settings) => {
        if (settings) {
          setPriceSettings(settings)
          setStandardPriceInput(settings.standard.toString())
          setCustomPriceInput(settings.custom.toString())
        }
      }
    )

    return () => {
      console.log('[DEBUG] App.tsx: Cleanup do useEffect principal.');
      unsubscribeClients()
      unsubscribeSales()
      unsubscribePayments()
      unsubscribeSettings()
    }
  }, [])

  const clientBalances = useMemo(() => {
    const balances: { [key: string]: number } = {}
    clients.forEach((c) => (balances[c.id] = 0))

    sales.forEach((sale) => {
      if (balances[sale.clientId] !== undefined) {
        balances[sale.clientId] += sale.totalValue
      }
    })
    return balances
  }, [clients, sales])

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId]
  )

  const currentClientPrice = useMemo(() => {
    if (!selectedClient) return priceSettings.standard
    return selectedClient.priceType === 'CUSTOM'
      ? priceSettings.custom
      : priceSettings.standard
  }, [selectedClient, priceSettings])

  const handleSaveClient = async (
    name: string,
    phone: string,
    priceType: PriceType,
    avatar?: string
  ) => {
    console.log('[DEBUG] App.tsx: handleSaveClient INICIADA.');
    try {
      console.log('[DEBUG] App.tsx: Criando objeto clientToSave...');
      const clientToSave: Client = editingClient
        ? {
            ...editingClient,
            name,
            phone,
            priceType,
            avatar: avatar || editingClient.avatar
          }
        : { id: crypto.randomUUID(), name, phone, priceType, avatar };
      
      console.log('[DEBUG] App.tsx: Objeto clientToSave criado:', JSON.stringify(clientToSave, null, 2));
      console.log('[DEBUG] App.tsx: Chamando firestoreService.saveClient...');
      
      await firestoreService.saveClient(clientToSave);

      console.log('[DEBUG] App.tsx: firestoreService.saveClient completado com SUCESSO.');

      setEditingClient(null)
      setIsClientModalOpen(false)
    } catch (error) {
      console.error('[DEBUG] App.tsx: ERRO DETECTADO em handleSaveClient:', error)
      alert(`Ocorreu um erro ao salvar o cliente: ${error}`)
    }
  }

  // ... (restante do código permanece o mesmo)
  const confirmDeleteClient = async () => {
    if (clientToDeleteId) {
      try {
        await firestoreService.deleteClient(clientToDeleteId)
        if (selectedClientId === clientToDeleteId) {
          setClientView('LIST')
          setSelectedClientId(null)
        }
        setClientToDeleteId(null)
      } catch (error) {
        console.error('Erro ao deletar cliente:', error)
        alert(`Ocorreu um erro ao deletar o cliente: ${error}`)
      }
    }
  }

  const handleAddSale = async (liters: number, date: string) => {
    if (!selectedClientId) return
    try {
      const priceToUse = currentClientPrice
      const newSale: Sale = {
        id: crypto.randomUUID(),
        clientId: selectedClientId,
        date,
        liters,
        totalValue: liters * priceToUse
      }
      await firestoreService.saveSale(newSale)
      setIsSaleModalOpen(false) // Fechar modal no sucesso
    } catch (error) {
      console.error('Erro ao adicionar venda:', error)
      alert(`Ocorreu um erro ao adicionar a venda: ${error}`)
    }
  }

  const confirmDeleteSale = async () => {
    if (saleToDeleteId) {
      try {
        await firestoreService.deleteSale(saleToDeleteId)
        setSaleToDeleteId(null)
      } catch (error) {
        console.error('Erro ao deletar venda:', error)
        alert(`Ocorreu um erro ao deletar a venda: ${error}`)
      }
    }
  }

  const handlePayDebt = async () => {
    if (!selectedClientId) return
    const amount = clientBalances[selectedClientId]
    const client = clients.find((c) => c.id === selectedClientId)
    if (amount > 0 && client) {
      try {
        const currentDate = new Date().toISOString()
        const salesToBePaid = sales.filter(
          (s) => s.clientId === selectedClientId
        )
        const newPayment: Payment = {
          id: crypto.randomUUID(),
          clientId: selectedClientId,
          clientName: client.name,
          amount: amount,
          date: currentDate,
          salesSnapshot: salesToBePaid
        }
        await firestoreService.savePayment(
          newPayment,
          salesToBePaid.map((s) => s.id)
        )

        setLastPaymentInfo({
          clientName: client.name,
          amount: amount,
          sales: salesToBePaid,
          date: currentDate
        })
        setIsReceiptModalOpen(true)
      } catch (error) {
        console.error('Erro ao registrar pagamento:', error)
        alert(`Ocorreu um erro ao registrar o pagamento: ${error}`)
      }
    }
    setIsPayModalOpen(false)
  }

  const handleGenerateReceipt = (payment?: Payment) => {
    if (payment) {
      if (payment.salesSnapshot) {
        generateReceipt(
          payment.clientName,
          payment.amount,
          payment.salesSnapshot,
          payment.date
        )
      } else {
        alert('Detalhes indisponíveis para este registro antigo.')
      }
      return
    }
    if (lastPaymentInfo) {
      generateReceipt(
        lastPaymentInfo.clientName,
        lastPaymentInfo.amount,
        lastPaymentInfo.sales,
        lastPaymentInfo.date
      )
      setIsReceiptModalOpen(false)
    }
  }

  const confirmDeletePayment = async () => {
    if (paymentToDeleteId) {
      try {
        await firestoreService.deletePayment(paymentToDeleteId)
        setPaymentToDeleteId(null)
      } catch (error) {
        console.error('Erro ao deletar pagamento:', error)
        alert(`Ocorreu um erro ao deletar o pagamento: ${error}`)
      }
    }
  }

  return (
    <div className='min-h-screen bg-slate-950 text-slate-100 font-sans pb-32'>
      {/* Header */}
      {!(activeTab === 'CLIENTS' && clientView === 'DETAILS') && (
        <header className='sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 shadow-md'>
          {/* ... */}
        </header>
      )}

      <main
        className={`max-w-2xl mx-auto ${
          activeTab === 'CLIENTS' && clientView === 'DETAILS' ? 'p-0' : 'p-4'
        }`}
      >
        {/* ... */}
      </main>

      {/* Bottom Navigation Bar */}
      <div className='fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)] px-2 pb-6 pt-2'>
        {/* ... */}
      </div>

      {/* Modals */}
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
        onSave={handleAddSale}
        currentPrice={currentClientPrice}
      />

      <PayDebtModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        onConfirm={handlePayDebt}
        clientName={selectedClient?.name || ''}
        totalValue={selectedClient ? clientBalances[selectedClient.id] : 0}
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
        message='Tem certeza que deseja excluir este cliente? Todo o histórico de vendas será perdido.'
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
        message='Deseja remover este registro de pagamento do histórico?'
        isDanger
      />
    </div>
  )
}


export default App
