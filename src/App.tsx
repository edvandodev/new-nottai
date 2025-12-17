
import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, User, Trash2, X, FileText } from 'lucide-react'
import { firestoreService } from './services/firestore'
import { Client, Sale, Payment } from './types'
import { ClientModal, SaleModal, PaymentModal, ConfirmModal } from './components/Modals'
import { generateAndSharePDF } from './services/pdfGenerator'

function App() {
  const [clients, setClients] = useState<Client[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Estados para controlar os modais
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null)
  const [clientToDeleteId, setClientToDeleteId] = useState<string | null>(null)
  const [saleToDeleteId, setSaleToDeleteId] = useState<string | null>(null)
  const [paymentToDeleteId, setPaymentToDeleteId] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = firestoreService.watchClients(setClients)
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (selectedClientId) {
      const unsubscribeSales = firestoreService.watchSales(selectedClientId, setSales)
      const unsubscribePayments = firestoreService.watchPayments(selectedClientId, setPayments)
      return () => {
        unsubscribeSales()
        unsubscribePayments()
      }
    } else {
      setSales([])
      setPayments([])
    }
  }, [selectedClientId])

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId)
  }

  const handleBackToClients = () => {
    setSelectedClientId(null)
    setSearchTerm('')
  }

  const handleSaveClient = async (name: string, price: number) => {
    try {
      if (clientToEdit) {
        await firestoreService.saveClient({ ...clientToEdit, name, price })
      } else {
        const newClient: Client = { id: crypto.randomUUID(), name, price }
        await firestoreService.saveClient(newClient)
      }
      setIsClientModalOpen(false)
      setClientToEdit(null)
    } catch (error) {
      console.error('Erro ao salvar cliente:', error)
      alert(\`Ocorreu um erro ao salvar o cliente: ${error}\`)
    }
  }

  const openEditClientModal = (client: Client) => {
    setClientToEdit(client)
    setIsClientModalOpen(true)
  }

  const confirmDeleteClient = async () => {
    if (!clientToDeleteId) return
    try {
      await firestoreService.deleteClient(clientToDeleteId)
      setClientToDeleteId(null)
      if (selectedClientId === clientToDeleteId) {
        setSelectedClientId(null)
      }
    } catch (error) {
      console.error('Erro ao deletar cliente:', error)
      alert(\`Ocorreu um erro ao deletar o cliente: ${error}\`)
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
      setIsSaleModalOpen(false)
    } catch (error) {
      console.error('Erro ao adicionar venda:', error)
      alert(\`Ocorreu um erro ao adicionar a venda: ${error}\`)
    }
  }

  const confirmDeleteSale = async () => {
    if (!saleToDeleteId) return
    try {
      await firestoreService.deleteSale(saleToDeleteId)
      setSaleToDeleteId(null)
    } catch (error) {
      console.error('Erro ao deletar venda:', error)
      alert(\`Ocorreu um erro ao deletar a venda: ${error}\`)
    }
  }

  const handleAddPayment = async (value: number, date: string) => {
    if (!selectedClientId) return
    try {
      const newPayment: Payment = {
        id: crypto.randomUUID(),
        clientId: selectedClientId,
        date,
        value
      }
      await firestoreService.savePayment(newPayment)
      setIsPaymentModalOpen(false)
    } catch (error) {
      console.error('Erro ao adicionar pagamento:', error)
      alert(\`Ocorreu um erro ao adicionar o pagamento: ${error}\`)
    }
  }

  const confirmDeletePayment = async () => {
    if (!paymentToDeleteId) return
    try {
      await firestoreService.deletePayment(paymentToDeleteId)
      setPaymentToDeleteId(null)
    } catch (error) {
      console.error('Erro ao deletar pagamento:', error)
      alert(\`Ocorreu um erro ao deletar o pagamento: ${error}\`)
    }
  }

  const filteredClients = useMemo(() =>
    clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase())
    ), [clients, searchTerm])

  const selectedClient = useMemo(() =>
    clients.find(c => c.id === selectedClientId), [clients, selectedClientId])

  const currentClientPrice = useMemo(() => {
    const client = clients.find(c => c.id === selectedClientId)
    return client ? client.price : 0
  }, [clients, selectedClientId])

  const combinedHistory = useMemo(() => {
    const history = [
      ...sales.map(s => ({ ...s, type: 'sale' as const })),
      ...payments.map(p => ({ ...p, type: 'payment' as const }))
    ]
    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [sales, payments])

  const totalSales = useMemo(() =>
    sales.reduce((sum, sale) => sum + sale.totalValue, 0), [sales])

  const totalPayments = useMemo(() =>
    payments.reduce((sum, payment) => sum + payment.value, 0), [payments])

  const balance = useMemo(() => totalSales - totalPayments, [totalSales, totalPayments])


  const handleGeneratePDF = () => {
    if (selectedClient && combinedHistory.length > 0) {
      generateAndSharePDF(selectedClient, combinedHistory, totalSales, totalPayments, balance);
    } else {
      alert("Não há dados suficientes para gerar o relatório.");
    }
  };


  // Renderização da lista de clientes
  const renderClientList = () => (
    <div className='p-4'>
      <div className='flex justify-between items-center mb-4'>
        <h1 className='text-2xl font-bold text-slate-200'>Clientes</h1>
        <button
          onClick={() => { setClientToEdit(null); setIsClientModalOpen(true); }}
          className='bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-2 rounded-full shadow-lg transition-colors'
        >
          <Plus size={24} />
        </button>
      </div>
      <div className='relative mb-4'>
        <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' size={20} />
        <input
          type='text'
          placeholder='Buscar cliente...'
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className='w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
        />
      </div>
      <div className='space-y-3'>
        {filteredClients.map(client => (
          <div
            key={client.id}
            className='bg-slate-800 rounded-lg p-4 flex justify-between items-center shadow-md transition-all hover:bg-slate-700/50'
          >
            <button onClick={() => handleSelectClient(client.id)} className='flex-grow text-left'>
              <div className='flex items-center'>
                <div className='p-3 bg-slate-700 rounded-full mr-4'>
                  <User className='text-slate-300' />
                </div>
                <div>
                  <p className='font-semibold text-lg text-slate-200'>{client.name}</p>
                  <p className='text-sm text-slate-400'>Preço do Litro: R$ {client.price.toFixed(2)}</p>
                </div>
              </div>
            </button>
            <div className='flex items-center'>
              <button onClick={(e) => { e.stopPropagation(); openEditClientModal(client); }} className='p-2 text-slate-400 hover:text-indigo-400'>
                <FileText size={20} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setClientToDeleteId(client.id); }} className='p-2 text-slate-400 hover:text-red-500'>
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // Renderização do histórico do cliente
  const renderClientHistory = () => {
    if (!selectedClient) return null
    return (
      <div className='p-4'>
        <div className='flex justify-between items-center mb-4'>
          <button onClick={handleBackToClients} className='text-indigo-400 hover:text-indigo-300 font-semibold'>
            &larr; Voltar
          </button>
          <h1 className='text-2xl font-bold text-slate-200'>{selectedClient.name}</h1>
          <button onClick={handleGeneratePDF} className='p-2 text-slate-400 hover:text-green-500'>
            <FileText size={24} />
          </button>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-center'>
          <div className='bg-slate-800 p-4 rounded-lg'>
            <p className='text-sm text-slate-400'>Total em Vendas</p>
            <p className='text-2xl font-bold text-amber-400'>R$ {totalSales.toFixed(2)}</p>
          </div>
          <div className='bg-slate-800 p-4 rounded-lg'>
            <p className='text-sm text-slate-400'>Total Pago</p>
            <p className='text-2xl font-bold text-green-400'>R$ {totalPayments.toFixed(2)}</p>
          </div>
          <div className='bg-slate-800 p-4 rounded-lg'>
            <p className='text-sm text-slate-400'>Saldo Devedor</p>
            <p className='text-2xl font-bold text-red-500'>R$ {balance.toFixed(2)}</p>
          </div>
        </div>

        <div className='flex justify-center gap-4 mb-6'>
          <button
            onClick={() => setIsSaleModalOpen(true)}
            className='bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg transition-colors'
          >
            Adicionar Venda
          </button>
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className='bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg transition-colors'
          >
            Registrar Pagamento
          </button>
        </div>

        <div className='space-y-3'>
          {combinedHistory.length > 0 ? (
            combinedHistory.map(item => (
              <div
                key={`${item.type}-${item.id}`}
                className={`bg-slate-800 rounded-lg p-4 flex justify-between items-center shadow-md border-l-4 ${item.type === 'sale' ? 'border-blue-500' : 'border-green-500'}`}
              >
                <div>
                  <p className='font-semibold text-slate-300'>
                    {item.type === 'sale' ? `${item.liters} Litros` : 'Pagamento'}
                  </p>
                  <p className='text-sm text-slate-400'>
                    {new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                  </p>
                </div>
                <div className='flex items-center'>
                  <p className={`font-bold text-lg ${item.type === 'sale' ? 'text-red-500' : 'text-green-400'}`}>
                    {item.type === 'sale' ? `- R$ ${item.totalValue.toFixed(2)}` : `+ R$ ${item.value.toFixed(2)}`}
                  </p>
                  <button
                    onClick={() => item.type === 'sale' ? setSaleToDeleteId(item.id) : setPaymentToDeleteId(item.id)}
                    className='ml-4 p-2 text-slate-500 hover:text-red-500'
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className='text-center text-slate-400 mt-8'>Nenhum registro encontrado.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className='bg-slate-900 min-h-screen text-white'>
      <div className='container mx-auto max-w-2xl'>
        {selectedClientId ? renderClientHistory() : renderClientList()}
      </div>

      {/* Modais */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => { setIsClientModalOpen(false); setClientToEdit(null); }}
        onSave={handleSaveClient}
        client={clientToEdit}
      />

      <SaleModal
        isOpen={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        onAdd={handleAddSale}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onAdd={handleAddPayment}
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
