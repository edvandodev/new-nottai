
import React, { useState, useEffect, useMemo } from 'react';
import { firestoreService } from './services/firestore';
import { Client, Sale, Payment, PriceSettings, PriceType, ViewState, TabState } from './types';
import { 
  AddClientModal, 
  AddSaleModal, 
  PayDebtModal, 
  ConfirmModal, 
  SuccessReceiptModal 
} from './components/Modals';
import { generateReceipt } from './services/pdfGenerator';
import { Users, FileText, Settings, Plus, Search, ArrowLeft } from 'lucide-react';

const DEFAULT_SETTINGS: PriceSettings = {
  standard: 0,
  custom: 0,
};

function App() {
  const [activeTab, setActiveTab] = useState<TabState>('CLIENTS');
  const [clientView, setClientView] = useState<ViewState>('LIST');

  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [priceSettings, setPriceSettings] = useState<PriceSettings>(DEFAULT_SETTINGS);

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [standardPriceInput, setStandardPriceInput] = useState('');
  const [customPriceInput, setCustomPriceInput] = useState('');

  const [lastPaymentInfo, setLastPaymentInfo] = useState<{
    clientName: string;
    amount: number;
    sales: Sale[];
    date: string;
  } | null>(null);

  const [clientToDeleteId, setClientToDeleteId] = useState<string | null>(null);
  const [saleToDeleteId, setSaleToDeleteId] = useState<string | null>(null);
  const [paymentToDeleteId, setPaymentToDeleteId] = useState<string | null>(null);

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribeClients = firestoreService.listenToClients(setClients);
    const unsubscribeSales = firestoreService.listenToSales(setSales);
    const unsubscribePayments = firestoreService.listenToPayments(setPayments);
    const unsubscribeSettings = firestoreService.listenToPriceSettings((settings) => {
      if (settings) {
        setPriceSettings(settings);
        setStandardPriceInput(settings.standard.toString());
        setCustomPriceInput(settings.custom.toString());
      }
    });

    return () => {
      unsubscribeClients();
      unsubscribeSales();
      unsubscribePayments();
      unsubscribeSettings();
    };
  }, []);

  const clientBalances = useMemo(() => {
    const balances: { [key: string]: number } = {};
    clients.forEach((c) => (balances[c.id] = 0));

    sales.forEach((sale) => {
      if (balances[sale.clientId] !== undefined) {
        balances[sale.clientId] += sale.totalValue;
      }
    });
    
    payments.forEach((payment) => {
        if(balances[payment.clientId] !== undefined) {
            balances[payment.clientId] -= payment.amount;
        }
    });

    return balances;
  }, [clients, sales, payments]);
  
  const filteredClients = useMemo(() => {
      return clients
        .map(client => ({
            ...client,
            balance: clientBalances[client.id] || 0
        }))
        .filter(client => client.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, clientBalances, searchTerm]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId]
  );
  
  const selectedClientHistory = useMemo(() => {
      if(!selectedClientId) return [];
      const clientSales = sales.filter(s => s.clientId === selectedClientId).map(s => ({...s, type: 'sale'}));
      const clientPayments = payments.filter(p => p.clientId === selectedClientId).map(p => ({...p, type: 'payment'}));

      return [...clientSales, ...clientPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, payments, selectedClientId]);

  const currentClientPrice = useMemo(() => {
    if (!selectedClient) return priceSettings?.standard ?? 0;
    return selectedClient.priceType === 'CUSTOM'
      ? priceSettings?.custom ?? 0
      : priceSettings?.standard ?? 0;
  }, [selectedClient, priceSettings]);

  const handleSaveClient = async (name: string, phone: string, priceType: PriceType, avatar?: string) => {
    try {
      const resolvedAvatar = avatar ?? editingClient?.avatar;
      const baseClient = editingClient
        ? { ...editingClient, name, phone, priceType }
        : { id: crypto.randomUUID(), name, phone, priceType };
      const clientToSave = resolvedAvatar ? { ...baseClient, avatar: resolvedAvatar } : baseClient;
      await firestoreService.saveClient(clientToSave);
      setEditingClient(null);
      setIsClientModalOpen(false);
    } catch (error) {
      console.error('[DEBUG] App.tsx: ERRO DETECTADO em handleSaveClient:', error);
      alert(`Ocorreu um erro ao salvar o cliente: ${error}`);
    }
  };
  
    const handleAddSale = async (liters: number, date: string) => {
    if (!selectedClientId) return;
    try {
      const priceToUse = currentClientPrice;
      const newSale: Sale = {
        id: crypto.randomUUID(),
        clientId: selectedClientId,
        date,
        liters,
        totalValue: liters * priceToUse
      };
      await firestoreService.saveSale(newSale);
      setIsSaleModalOpen(false);
    } catch (error) {
      console.error('Erro ao adicionar venda:', error);
      alert(`Ocorreu um erro ao adicionar a venda: ${error}`);
    }
  };

  const renderClientList = () => (
    <>
      <header className='sticky top-0 z-30 bg-slate-950/80 backdrop-blur-sm p-4'>
          <div className='flex justify-between items-center mb-4'>
              <h1 className='text-3xl font-bold text-slate-100 tracking-tight'>Clientes</h1>
              <button
                  onClick={() => { setEditingClient(null); setIsClientModalOpen(true); }}
                  className='bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-3 rounded-full shadow-lg transition-transform active:scale-95'
              >
                  <Plus size={20} />
              </button>
          </div>
          <div className='relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-500' size={20} />
              <input
                  type='text'
                  placeholder='Buscar cliente...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='w-full bg-slate-800/80 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500'
              />
          </div>
      </header>
      <div className='px-4 space-y-3'>
          {filteredClients.map(client => (
              <div
                  key={client.id}
                  onClick={() => { setSelectedClientId(client.id); setClientView('DETAILS'); }}
                  className='bg-slate-900 rounded-2xl p-4 flex justify-between items-center shadow-md transition-all hover:bg-slate-800/50 active:scale-[0.98] border border-slate-800'
              >
                  <div className='flex items-center'>
                      <div className='p-3 bg-slate-800 rounded-full mr-4'>
                          <Users className='text-slate-400' size={20}/>
                      </div>
                      <div>
                          <p className='font-semibold text-lg text-slate-200'>{client.name}</p>
                          <p className={`text-sm ${client.balance > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                              Saldo: R$ {client.balance.toFixed(2)}
                          </p>
                      </div>
                  </div>
              </div>
          ))}
      </div>
    </>
  );

  const renderClientDetails = () => (
      <div>Detalhes do cliente</div>
  );
  
  const renderReports = () => (
      <div className='p-4'><h1 className='text-3xl font-bold text-slate-100 tracking-tight'>Relatórios</h1></div>
  )
  
  const renderSettings = () => (
      <div className='p-4'><h1 className='text-3xl font-bold text-slate-100 tracking-tight'>Configurações</h1></div>
  )

  const renderActiveView = () => {
    if (activeTab === 'CLIENTS') {
      if (clientView === 'LIST') {
        return renderClientList();
      }
      return renderClientDetails();
    }
    if (activeTab === 'REPORTS') {
      return renderReports();
    }
    if (activeTab === 'SETTINGS') {
      return renderSettings();
    }
    return null;
  };
  
  const renderBottomNav = () => (
       <div className='fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-sm border-t border-slate-800 rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)]'>
        <div className='flex justify-around items-center max-w-2xl mx-auto px-2 pb-6 pt-4'>
          <button onClick={() => setActiveTab('CLIENTS')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'CLIENTS' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <Users size={24} />
            <span className='text-xs font-medium'>Clientes</span>
          </button>
          <button onClick={() => setActiveTab('REPORTS')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'REPORTS' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <FileText size={24} />
            <span className='text-xs font-medium'>Relatórios</span>
          </button>
          <button onClick={() => setActiveTab('SETTINGS')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'SETTINGS' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <Settings size={24} />
            <span className='text-xs font-medium'>Ajustes</span>
          </button>
        </div>
      </div>
  );

  return (
    <div className='min-h-screen bg-slate-950 text-slate-100 font-sans pb-32'>
      <main className='max-w-2xl mx-auto'>
        {renderActiveView()}
      </main>

      {renderBottomNav()}
      
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
      {/* Outros modais podem ser adicionados aqui */}
    </div>
  );
}

export default App;
