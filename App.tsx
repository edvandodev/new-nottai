import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ChevronLeft, Trash2, Milk, User, Phone, Droplets, DollarSign, Wallet, MessageCircle, Pencil, Settings as SettingsIcon, Users, CheckCircle, Search, X, ChevronDown, ChevronUp, FileText, Download, Tag, BarChart3, Calendar, TrendingUp } from 'lucide-react';
import { Client, Sale, Payment, ViewState, TabState, DEFAULT_SETTINGS, PriceSettings, PriceType } from './types';
import { storageService } from './services/storage';
import { AddClientModal, AddSaleModal, PayDebtModal, ConfirmModal, SuccessReceiptModal } from './components/Modals';
import { generateReceipt } from './services/pdfGenerator';

// Custom Payment Icon
const CustomPaymentIcon = ({ size = 20, className = "", strokeWidth = 2 }: { size?: number, className?: string, strokeWidth?: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 512 512" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="currentColor"
    strokeWidth={strokeWidth}
  >
    <g>
      <path d="m480.892 274.582c-18.896-6.396-38.938-.29-51.058 15.558l-55.864 73.053c.009-.398.03-.793.03-1.193 0-27.57-22.43-50-50-50h-99.231c-31.637-26.915-76.35-31.705-112.769-12.853v-2.147c0-8.284-6.716-15-15-15h-82c-8.284 0-15 6.716-15 15v200c0 8.284 6.716 15 15 15h82c8.284 0 15-6.716 15-15v-15h245.864c35.896 0 68.913-18.026 88.324-48.221l58.538-91.06c4.759-7.401 7.273-15.964 7.273-24.764.001-19.95-12.21-36.976-31.107-43.373zm-398.892 207.418h-52v-170h52zm397.491-155.504-58.539 91.061c-13.864 21.567-37.448 34.443-63.088 34.443h-245.864v-117.281l5.017-3.583c28.141-20.101 66.657-17.293 91.587 6.677 2.794 2.687 6.52 4.188 10.396 4.188h105c11.028 0 20 8.972 20 20s-8.972 20-20 20h-105-2c-8.284 0-15 6.716-15 15s6.716 15 15 15h2 105 13.35c23.208 0 45.479-11.006 59.576-29.441l56.738-74.195c6.385-8.348 15.09-6.217 17.608-5.365 2.517.853 10.728 4.449 10.728 14.958 0 3.033-.867 5.985-2.509 8.538z"/>
      <path d="m262.055 179.712c9.488 6.207 16.181 8.388 24.255 9.086v6.202c0 5.522 4.478 10 10 10s10-4.478 10-10v-7.162c16.616-4.215 27.266-18.408 29.619-32.403 3.026-18.005-6.751-34.277-24.329-40.491-1.741-.615-3.515-1.255-5.29-1.914v-32.311c3.055 1.126 4.645 2.657 4.872 2.888 3.638 4.104 9.909 4.514 14.051.905 4.164-3.627 4.6-9.944.972-14.108-3.323-3.815-10.186-8.595-19.895-10.276v-5.128c0-5.522-4.478-10-10-10s-10 4.478-10 10v6.224c-.616.163-1.238.336-1.865.525-11.853 3.57-20.705 13.689-23.102 26.407-2.199 11.671 1.59 22.963 9.889 29.472 3.917 3.073 8.691 5.889 15.078 8.817v42.231c-4.52-.635-7.905-2.167-13.306-5.7-4.622-3.026-10.82-1.727-13.843 2.894s-1.728 10.818 2.894 13.842zm44.255-45.373c10.822 4.558 10.552 13.873 9.896 17.781-.911 5.42-4.271 11.118-9.896 14.339zm-22.736-32.447c-2.365-1.854-3.376-5.792-2.577-10.031.579-3.073 2.261-6.615 5.312-8.956v20.913c-.984-.631-1.902-1.273-2.735-1.926z"/>
      <path d="m297 250c68.925 0 125-56.075 125-125s-56.075-125-125-125-125 56.075-125 125 56.075 125 125 125zm0-220c52.383 0 95 42.617 95 95s-42.617 95-95 95-95-42.617-95-95 42.617-95-95z"/>
    </g>
  </svg>
);

function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<TabState>('CLIENTS');
  const [clientView, setClientView] = useState<ViewState>('LIST');
  
  // Data State
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [priceSettings, setPriceSettings] = useState<PriceSettings>(DEFAULT_SETTINGS);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Report State
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());

  // Selection State
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);
  
  // Edit State
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [standardPriceInput, setStandardPriceInput] = useState('');
  const [customPriceInput, setCustomPriceInput] = useState('');
  
  // Receipt State
  const [lastPaymentInfo, setLastPaymentInfo] = useState<{ clientName: string, amount: number, sales: Sale[], date: string } | null>(null);
  
  // Delete State
  const [clientToDeleteId, setClientToDeleteId] = useState<string | null>(null);
  const [saleToDeleteId, setSaleToDeleteId] = useState<string | null>(null);
  const [paymentToDeleteId, setPaymentToDeleteId] = useState<string | null>(null);
  
  // Modals
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Initial Load
  useEffect(() => {
    setClients(storageService.getClients());
    setSales(storageService.getSales());
    setPayments(storageService.getPayments());
    
    const storedSettings = storageService.getPriceSettings();
    setPriceSettings(storedSettings);
    setStandardPriceInput(storedSettings.standard.toString());
    setCustomPriceInput(storedSettings.custom.toString());
  }, []);

  // Persistence
  useEffect(() => { storageService.saveClients(clients); }, [clients]);
  useEffect(() => { storageService.saveSales(sales); }, [sales]);
  useEffect(() => { storageService.savePayments(payments); }, [payments]);
  useEffect(() => { storageService.savePriceSettings(priceSettings); }, [priceSettings]);

  // Derived State
  const clientBalances = useMemo(() => {
    const balances: { [key: string]: number } = {};
    clients.forEach(c => balances[c.id] = 0);
    
    sales.forEach(sale => {
      if (balances[sale.clientId] !== undefined) {
        balances[sale.clientId] += sale.totalValue;
      }
    });
    return balances;
  }, [clients, sales]);

  const totalReceivable = useMemo(() => {
    return Object.values(clientBalances).reduce((acc: number, curr: number) => acc + curr, 0);
  }, [clientBalances]);

  // --- Recency Logic ---
  const lastInteractions = useMemo(() => {
    const map = new Map<string, number>();
    
    // Initialize
    clients.forEach(c => map.set(c.id, 0));

    // Check Sales
    sales.forEach(s => {
        const time = new Date(s.date).getTime();
        const current = map.get(s.clientId) || 0;
        if (time > current) map.set(s.clientId, time);
    });

    // Check Payments
    payments.forEach(p => {
        const time = new Date(p.date).getTime();
        const current = map.get(p.clientId) || 0;
        if (time > current) map.set(p.clientId, time);
    });

    return map;
  }, [clients, sales, payments]);

  const filteredClients = useMemo(() => {
    // Create a copy to ensure we don't mutate state when sorting
    let result = [...clients];

    // 1. Search Filter
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(client => 
        client.name.toLowerCase().includes(lowerQuery) || 
        client.phone.includes(lowerQuery)
      );
    }

    // 2. Sort by Recency (Descending)
    return result.sort((a, b) => {
      const lastA = lastInteractions.get(a.id) || 0;
      const lastB = lastInteractions.get(b.id) || 0;
      
      // If timestamps are equal (e.g. both 0), sort alphabetically
      if (lastB === lastA) {
          return a.name.localeCompare(b.name);
      }
      return lastB - lastA;
    });
  }, [clients, searchQuery, lastInteractions]);

  const selectedClient = useMemo(() => 
    clients.find(c => c.id === selectedClientId), 
  [clients, selectedClientId]);

  const currentClientPrice = useMemo(() => {
    if (!selectedClient) return priceSettings.standard;
    return selectedClient.priceType === 'CUSTOM' ? priceSettings.custom : priceSettings.standard;
  }, [selectedClient, priceSettings]);

  const selectedClientSales = useMemo(() => 
    sales.filter(s => s.clientId === selectedClientId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  [sales, selectedClientId]);

  const sortedPayments = useMemo(() => 
    [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  [payments]);

  // Report Logic
  const reportData = useMemo(() => {
    // Combine active sales AND sales from payment history (salesSnapshot)
    const allSales = [
      ...sales,
      ...payments.flatMap(p => p.salesSnapshot || [])
    ];

    const filteredSales = allSales.filter(s => {
      const d = new Date(s.date + 'T12:00:00');
      return d.getFullYear() === reportYear && d.getMonth() === reportMonth;
    });

    const totalLiters = filteredSales.reduce((acc, curr) => acc + curr.liters, 0);
    const totalValue = filteredSales.reduce((acc, curr) => acc + curr.totalValue, 0);

    // Weekly Breakdown
    const weeks: { [key: number]: { liters: number, value: number, label: string } } = {};
    
    filteredSales.forEach(s => {
      const d = new Date(s.date + 'T12:00:00');
      const weekNum = Math.ceil(d.getDate() / 7);
      
      if (!weeks[weekNum]) {
        weeks[weekNum] = { liters: 0, value: 0, label: `Semana ${weekNum}` };
      }
      weeks[weekNum].liters += s.liters;
      weeks[weekNum].value += s.totalValue;
    });

    return {
      totalLiters,
      totalValue,
      weeks: Object.values(weeks).sort((a, b) => a.label.localeCompare(b.label))
    };
  }, [sales, payments, reportYear, reportMonth]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    
    // Check active sales
    sales.forEach(s => years.add(new Date(s.date).getFullYear()));
    
    // Check paid sales (historical)
    payments.forEach(p => {
      if (p.salesSnapshot) {
        p.salesSnapshot.forEach(s => years.add(new Date(s.date).getFullYear()));
      }
    });

    return Array.from(years).sort((a, b) => b - a);
  }, [sales, payments]);

  // --- Handlers ---

  // Navigation
  const handleTabChange = (tab: TabState) => {
    setActiveTab(tab);
    // Reset client view when switching tabs
    if (tab !== 'CLIENTS') {
        setSelectedClientId(null);
        setClientView('LIST');
        setSearchQuery(''); 
    }
  };

  const handleSelectClient = (id: string) => {
    setSelectedClientId(id);
    setClientView('DETAILS');
    window.scrollTo(0,0);
  };

  const handleBackToClientList = () => {
    setClientView('LIST');
    setSelectedClientId(null);
  };

  const togglePaymentExpand = (id: string) => {
    if (expandedPaymentId === id) {
      setExpandedPaymentId(null);
    } else {
      setExpandedPaymentId(id);
    }
  };

  // CRUD Client
  const handleOpenAddClient = () => {
    setEditingClient(null);
    setIsClientModalOpen(true);
  };

  const handleOpenEditClient = (client: Client) => {
    setEditingClient(client);
    setIsClientModalOpen(true);
  };

  const handleSaveClient = (name: string, phone: string, priceType: PriceType, avatar?: string) => {
    if (editingClient) {
      setClients(prev => prev.map(c => 
        c.id === editingClient.id ? { ...c, name, phone, priceType, avatar: avatar || c.avatar } : c
      ));
    } else {
      const newClient: Client = {
        id: crypto.randomUUID(),
        name,
        phone,
        priceType,
        avatar
      };
      setClients(prev => [...prev, newClient]);
    }
    setEditingClient(null);
  };

  const handleDeleteClient = (id: string) => setClientToDeleteId(id);

  const confirmDeleteClient = () => {
    if (clientToDeleteId) {
      setClients(prev => prev.filter(c => c.id !== clientToDeleteId));
      setSales(prev => prev.filter(s => s.clientId !== clientToDeleteId));
      
      if (selectedClientId === clientToDeleteId) {
        setClientView('LIST');
        setSelectedClientId(null);
      }
      setClientToDeleteId(null);
    }
  };

  // CRUD Sale
  const handleAddSale = (liters: number, date: string) => {
    if (!selectedClientId) return;
    
    // Calculate price based on selected client type
    const priceToUse = currentClientPrice;

    const newSale: Sale = {
      id: crypto.randomUUID(),
      clientId: selectedClientId,
      date,
      liters,
      totalValue: liters * priceToUse
    };
    setSales(prev => [...prev, newSale]);
  };

  const handleDeleteSale = (id: string) => setSaleToDeleteId(id);

  const confirmDeleteSale = () => {
    if (saleToDeleteId) {
      setSales(prev => prev.filter(s => s.id !== saleToDeleteId));
      setSaleToDeleteId(null);
    }
  };

  // Payments / Pay Debt
  const handlePayDebt = () => {
    if (!selectedClientId) return;
    
    const amount = clientBalances[selectedClientId];
    const client = clients.find(c => c.id === selectedClientId);
    
    if (amount > 0 && client) {
      const currentDate = new Date().toISOString();
      
      // 1. Capture the sales that are being paid for the Receipt
      const salesToBePaid = sales.filter(s => s.clientId === selectedClientId);

      // 2. Create Payment Record (Include snapshot of sales)
      const newPayment: Payment = {
        id: crypto.randomUUID(),
        clientId: selectedClientId,
        clientName: client.name,
        amount: amount,
        date: currentDate,
        salesSnapshot: salesToBePaid
      };
      setPayments(prev => [newPayment, ...prev]);

      // 3. Clear Sales (Archive them implicitly by removing them from Active Sales)
      setSales(prev => prev.filter(s => s.clientId !== selectedClientId));

      // 4. Set Info for Receipt and Open Modal
      setLastPaymentInfo({
        clientName: client.name,
        amount: amount,
        sales: salesToBePaid,
        date: currentDate
      });
      setIsReceiptModalOpen(true);
    }
    
    setIsPayModalOpen(false);
  };

  const handleGenerateReceipt = (payment?: Payment) => {
    // If called from the list (re-generating)
    if (payment) {
      if (payment.salesSnapshot) {
        generateReceipt(
          payment.clientName,
          payment.amount,
          payment.salesSnapshot,
          payment.date
        );
      } else {
        alert("Detalhes indisponíveis para este registro antigo.");
      }
      return;
    }

    // If called from the success modal (just created)
    if (lastPaymentInfo) {
      generateReceipt(
        lastPaymentInfo.clientName,
        lastPaymentInfo.amount,
        lastPaymentInfo.sales,
        lastPaymentInfo.date
      );
      setIsReceiptModalOpen(false);
    }
  };

  const handleDeletePayment = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling accordion
    setPaymentToDeleteId(id);
  };
  
  const confirmDeletePayment = () => {
    if (paymentToDeleteId) {
      setPayments(prev => prev.filter(p => p.id !== paymentToDeleteId));
      setPaymentToDeleteId(null);
    }
  };

  // Settings
  const handleSavePrices = () => {
    const std = parseFloat(standardPriceInput.replace(',', '.'));
    const cst = parseFloat(customPriceInput.replace(',', '.'));
    
    if (!isNaN(std) && std >= 0 && !isNaN(cst) && cst >= 0) {
      setPriceSettings({ standard: std, custom: cst });
      alert('Preços atualizados com sucesso!');
    } else {
      setStandardPriceInput(priceSettings.standard.toString());
      setCustomPriceInput(priceSettings.custom.toString());
    }
  };

  // Helpers
  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${finalPhone}`, '_blank');
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();
  const getMonthName = (index: number) => {
    return new Date(2024, index, 1).toLocaleDateString('pt-BR', { month: 'long' });
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-32">
      
      {/* Header - Hidden when viewing client details for profile look */}
      {!(activeTab === 'CLIENTS' && clientView === 'DETAILS') && (
        <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 shadow-md">
          <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Milk size={24} className="text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                {activeTab === 'CLIENTS' && 'Meus Clientes'}
                {activeTab === 'PAYMENTS' && 'Histórico'}
                {activeTab === 'REPORTS' && 'Relatórios'}
                {activeTab === 'SETTINGS' && 'Ajustes'}
              </h1>
            </div>
          </div>
        </header>
      )}

      <main className={`max-w-2xl mx-auto ${activeTab === 'CLIENTS' && clientView === 'DETAILS' ? 'p-0' : 'p-4'}`}>

        {/* --- TAB: CLIENTS --- */}
        {activeTab === 'CLIENTS' && (
          <>
            {/* View: Client List */}
            {clientView === 'LIST' && (
              <div className="space-y-4 animate-fade-in">
                
                {/* Total Receivable Card */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-850 p-5 rounded-2xl border border-slate-700/50 shadow-md flex items-center justify-between relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
                   <div className="relative z-10">
                      <span className="block text-slate-400 text-sm font-medium mb-1">Total a Receber</span>
                      <span className="text-3xl font-bold text-green-400 tracking-tight">{formatCurrency(totalReceivable)}</span>
                   </div>
                   <div className="h-10 w-10 bg-slate-700/50 rounded-full flex items-center justify-center text-green-400 border border-slate-600/30">
                     <DollarSign size={20} />
                   </div>
                </div>

                {/* Search Bar */}
                {clients.length > 0 && (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={20} className="text-slate-500" />
                    </div>
                    <input 
                        type="text"
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-10 pr-10 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="Buscar cliente por nome ou telefone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 pb-1">
                   <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold ml-1">
                     {searchQuery ? `Resultados (${filteredClients.length})` : 'Lista de Clientes'}
                   </h2>
                   <button 
                     onClick={handleOpenAddClient}
                     className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                   >
                     <Plus size={14} strokeWidth={3} />
                     NOVO CLIENTE
                   </button>
                </div>
                
                {clients.length === 0 ? (
                  <div className="text-center py-20 px-6 rounded-2xl bg-slate-900 border border-slate-800 border-dashed">
                    <User size={48} className="mx-auto text-slate-700 mb-4" />
                    <p className="text-slate-400 text-lg">Nenhum cliente cadastrado.</p>
                    <p className="text-slate-600 text-sm mt-1">Adicione um novo cliente acima.</p>
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="text-center py-12 px-6 rounded-2xl bg-slate-900/50 border border-slate-800 border-dashed">
                    <Search size={32} className="mx-auto text-slate-700 mb-3" />
                    <p className="text-slate-500">Nenhum cliente encontrado para "{searchQuery}".</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {filteredClients.map(client => (
                      <div 
                        key={client.id}
                        onClick={() => handleSelectClient(client.id)}
                        className="group bg-slate-800 rounded-xl p-4 border border-slate-700 active:scale-[0.98] transition-all hover:border-blue-500/50 cursor-pointer shadow-sm relative overflow-hidden"
                      >
                        <div className="flex justify-between items-center relative z-10">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="h-14 w-14 rounded-full bg-slate-700 flex-shrink-0 border-2 border-slate-600 overflow-hidden flex items-center justify-center">
                              {client.avatar ? (
                                <img src={client.avatar} alt={client.name} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-slate-400 font-bold text-lg">{getInitials(client.name)}</span>
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{client.name}</h3>
                                {client.priceType === 'CUSTOM' && (
                                  <div className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    <Tag size={10} />
                                  </div>
                                )}
                              </div>
                              {client.phone && (
                                <div className="flex items-center text-slate-400 text-sm mt-1">
                                  <Phone size={12} className="mr-1" />
                                  {client.phone}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right pl-2">
                            <span className="block text-xs text-slate-500 font-medium uppercase mb-1">Saldo</span>
                            <span className={`text-xl font-bold ${clientBalances[client.id] > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                              {formatCurrency(clientBalances[client.id])}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* View: Client Details (Visual Overhaul) */}
            {clientView === 'DETAILS' && selectedClient && (
              <div className="animate-fade-in relative min-h-screen pb-20 bg-slate-950">
                
                {/* Top Nav inside Header - Fixed Position */}
                <div className="fixed top-0 left-0 right-0 p-4 flex justify-between items-center z-50 max-w-2xl mx-auto pointer-events-none">
                  <button onClick={handleBackToClientList} className="pointer-events-auto p-2 bg-slate-900/40 hover:bg-slate-800/60 backdrop-blur-md rounded-full text-white transition-all border border-white/10 shadow-lg">
                    <ChevronLeft size={24} />
                  </button>
                  <div className="flex gap-2 pointer-events-auto">
                      <button 
                        type="button"
                        onClick={() => handleOpenEditClient(selectedClient)}
                        className="pointer-events-auto p-2 bg-slate-900/40 hover:bg-slate-800/60 backdrop-blur-md rounded-full text-white transition-all border border-white/10 shadow-lg"
                      >
                        <Pencil size={20} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDeleteClient(selectedClient.id)}
                        className="pointer-events-auto p-2 bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md rounded-full text-red-200 transition-all border border-red-500/20 shadow-lg"
                      >
                        <Trash2 size={20} />
                      </button>
                  </div>
                </div>

                {/* Visual Header */}
                <div className="relative h-48 bg-gradient-to-br from-blue-700 to-blue-900 rounded-b-[2.5rem] shadow-xl overflow-hidden">
                   {/* Abstract Circles */}
                   <div className="absolute top-[-20%] left-[-10%] w-60 h-60 rounded-full bg-white/5 blur-3xl"></div>
                   <div className="absolute bottom-[-20%] right-[-10%] w-60 h-60 rounded-full bg-blue-400/10 blur-3xl"></div>
                </div>

                {/* Profile Section (Overlaps Header) */}
                <div className="px-6 -mt-16 relative z-10 flex flex-col items-center">
                    <div className="h-32 w-32 rounded-full bg-slate-800 border-4 border-slate-950 shadow-2xl overflow-hidden flex items-center justify-center">
                      {selectedClient.avatar ? (
                        <img src={selectedClient.avatar} alt={selectedClient.name} className="h-full w-full object-cover" />
                      ) : (
                        <User size={64} className="text-slate-600" />
                      )}
                    </div>
                    
                    <div className="mt-4 text-center">
                       <h2 className="text-2xl font-bold text-white">{selectedClient.name}</h2>
                       <div className="flex justify-center gap-2 mt-2">
                          <span className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs font-medium text-slate-300 uppercase tracking-wide">
                            {selectedClient.priceType === 'STANDARD' ? 'Preço Padrão' : 'Personalizado'}
                          </span>
                          <span className="px-3 py-1 bg-blue-900/30 border border-blue-500/30 rounded-full text-xs font-bold text-blue-400">
                             {formatCurrency(currentClientPrice)}/L
                          </span>
                       </div>
                    </div>

                    {selectedClient.phone && (
                        <button 
                          onClick={() => openWhatsApp(selectedClient.phone)}
                          className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl shadow-lg shadow-green-900/40 hover:bg-green-500 transition-all active:scale-95 font-medium text-sm"
                        >
                          <MessageCircle size={18} />
                          WhatsApp
                        </button>
                      )}
                </div>

                {/* Content Container */}
                <div className="px-4 mt-8 space-y-6">
                    {/* Debt Card */}
                    <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 flex justify-between items-center relative overflow-hidden">
                        <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-transparent via-blue-500/50 to-transparent"></div>
                        <div>
                          <p className="text-sm text-slate-400 font-medium mb-1">Total a Receber</p>
                          <p className={`text-4xl font-bold tracking-tight ${clientBalances[selectedClient.id] > 0 ? 'text-white' : 'text-slate-500'}`}>
                            {formatCurrency(clientBalances[selectedClient.id])}
                          </p>
                        </div>
                        
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${clientBalances[selectedClient.id] > 0 ? 'bg-blue-600/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                           {clientBalances[selectedClient.id] > 0 ? <Wallet size={24} /> : <CheckCircle size={24} />}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setIsSaleModalOpen(true)}
                            className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <Plus size={20} />
                            Nova Venda
                        </button>
                        
                        <button
                            onClick={() => setIsPayModalOpen(true)}
                            disabled={clientBalances[selectedClient.id] <= 0}
                            className={`flex-1 py-3.5 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
                                clientBalances[selectedClient.id] > 0 
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20' 
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                            }`}
                        >
                            <DollarSign size={20} />
                            Receber
                        </button>
                    </div>

                    {/* History */}
                    <div>
                        <div className="flex items-center justify-between mb-4 px-1">
                           <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Histórico de Compras</h3>
                        </div>
                        
                        {selectedClientSales.length === 0 ? (
                          <div className="text-center py-10 rounded-2xl border border-slate-800 border-dashed bg-slate-900/30">
                            <p className="text-slate-500">Nenhuma compra pendente.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {selectedClientSales.map(sale => (
                              <div key={sale.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between group hover:border-slate-700 transition-colors">
                                <div className="flex items-center gap-4">
                                   {/* Calender Icon Style Restored */}
                                   <div className="h-14 w-12 rounded-lg bg-slate-800 border border-slate-700 flex flex-col items-center justify-center shrink-0">
                                      <span className="text-[10px] uppercase font-bold text-slate-500">
                                        {new Date(sale.date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                                      </span>
                                      <span className="text-lg font-bold text-white leading-none">
                                         {sale.date.split('-')[2]}
                                      </span>
                                   </div>

                                   <div>
                                      <div className="text-white font-medium flex items-center gap-2">
                                         {sale.liters} {sale.liters === 1 ? 'Litro' : 'Litros'}
                                      </div>
                                      <div className="text-slate-500 text-xs">
                                         {formatCurrency(sale.totalValue)}
                                      </div>
                                   </div>
                                </div>
                                <button 
                                  onClick={() => handleDeleteSale(sale.id)}
                                  className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* --- TAB: PAYMENTS --- */}
        {activeTab === 'PAYMENTS' && (
          <div className="space-y-4 animate-fade-in">
             <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-md">
                <h2 className="text-sm text-slate-400 mb-1">Total Recebido (Histórico)</h2>
                <p className="text-3xl font-bold text-white">
                  {formatCurrency(payments.reduce((acc, p) => acc + p.amount, 0))}
                </p>
             </div>

             <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold ml-1 pt-2">Pagamentos Recentes</h2>

             {payments.length === 0 ? (
               <div className="text-center py-20 px-6 rounded-2xl bg-slate-900 border border-slate-800 border-dashed">
                 <Wallet size={48} className="mx-auto text-slate-700 mb-4" />
                 <p className="text-slate-400 text-lg">Nenhum pagamento registrado.</p>
                 <p className="text-slate-600 text-sm mt-1">Os pagamentos confirmados aparecerão aqui.</p>
               </div>
             ) : (
               <div className="space-y-3">
                 {sortedPayments.map(payment => (
                   <div 
                    key={payment.id} 
                    className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-sm transition-all"
                   >
                     <div 
                        onClick={() => togglePaymentExpand(payment.id)}
                        className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-700/30 transition-colors"
                     >
                       <div className="flex gap-4 items-center">
                          <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20">
                            <CheckCircle size={20} />
                          </div>
                          <div>
                            <p className="text-white font-bold">{payment.clientName}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(payment.date).toLocaleDateString('pt-BR')} às {new Date(payment.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                            </p>
                          </div>
                       </div>
                       <div className="text-right flex items-center gap-3">
                         <span className="text-green-400 font-bold text-lg">{formatCurrency(payment.amount)}</span>
                         {expandedPaymentId === payment.id ? (
                           <ChevronUp size={20} className="text-slate-500" />
                         ) : (
                           <ChevronDown size={20} className="text-slate-500" />
                         )}
                       </div>
                     </div>

                     {/* Expanded Details */}
                     {expandedPaymentId === payment.id && (
                       <div className="px-4 pb-4 pt-1 border-t border-slate-700/50 bg-slate-900/30 animate-fade-in">
                          <div className="mt-3 mb-4 space-y-2">
                             <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Itens Pagos</h4>
                             {payment.salesSnapshot && payment.salesSnapshot.length > 0 ? (
                               <div className="space-y-2">
                                 {payment.salesSnapshot.map(sale => (
                                    <div key={sale.id} className="flex justify-between text-sm text-slate-300 border-b border-slate-700/50 pb-1.5 last:border-0">
                                      <span>{new Date(sale.date + 'T12:00:00').toLocaleDateString('pt-BR')} - {sale.liters} {sale.liters === 1 ? 'Litro' : 'Litros'}</span>
                                      <span>{formatCurrency(sale.totalValue)}</span>
                                    </div>
                                 ))}
                               </div>
                             ) : (
                               <p className="text-sm text-slate-500 italic">Detalhes não disponíveis para este registro antigo.</p>
                             )}
                          </div>

                          <div className="flex gap-3">
                             {payment.salesSnapshot && (
                               <button 
                                 onClick={() => handleGenerateReceipt(payment)}
                                 className="flex-1 py-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 border border-blue-600/30 transition-colors"
                               >
                                 <FileText size={16} />
                                 Baixar Comprovante PDF
                               </button>
                             )}
                             
                             <button 
                                onClick={(e) => handleDeletePayment(payment.id, e)}
                                className="px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/30"
                                title="Apagar registro"
                              >
                                <Trash2 size={16} />
                              </button>
                          </div>
                       </div>
                     )}
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}

        {/* --- TAB: REPORTS --- */}
        {activeTab === 'REPORTS' && (
          <div className="space-y-6 animate-fade-in">
             
             {/* Filter Controls */}
             <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
               <div className="flex items-center gap-2 text-slate-400 mb-3 uppercase text-xs font-bold tracking-wider">
                 <Calendar size={14} />
                 Filtro de Período
               </div>
               <div className="flex gap-3">
                 <div className="flex-1">
                   <select 
                      value={reportMonth} 
                      onChange={(e) => setReportMonth(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                   >
                     {Array.from({length: 12}).map((_, i) => (
                       <option key={i} value={i}>{getMonthName(i)}</option>
                     ))}
                   </select>
                 </div>
                 <div className="flex-1">
                   <select 
                      value={reportYear} 
                      onChange={(e) => setReportYear(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                   >
                     {availableYears.map(year => (
                       <option key={year} value={year}>{year}</option>
                     ))}
                   </select>
                 </div>
               </div>
             </div>

             {/* Summary Cards */}
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-4 flex flex-col justify-between h-32">
                   <div className="flex justify-between items-start">
                     <span className="text-blue-300 font-medium text-sm">Total Litros</span>
                     <Droplets size={18} className="text-blue-400" />
                   </div>
                   <span className="text-3xl font-bold text-blue-100">{reportData.totalLiters} L</span>
                </div>

                <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-4 flex flex-col justify-between h-32">
                   <div className="flex justify-between items-start">
                     <span className="text-green-300 font-medium text-sm">Valor Total</span>
                     <DollarSign size={18} className="text-green-400" />
                   </div>
                   <span className="text-3xl font-bold text-green-100">{formatCurrency(reportData.totalValue)}</span>
                </div>
             </div>

             {/* Weekly Breakdown */}
             <div>
               <div className="flex items-center gap-2 mb-3">
                 <BarChart3 size={18} className="text-slate-500" />
                 <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider">Desempenho por Semana</h3>
               </div>
               
               {reportData.weeks.length === 0 ? (
                 <div className="bg-slate-900/50 rounded-xl p-8 text-center border border-slate-800 border-dashed">
                    <p className="text-slate-500">Nenhuma venda registrada neste período.</p>
                 </div>
               ) : (
                 <div className="space-y-3">
                    {reportData.weeks.map((week, idx) => (
                       <div key={idx} className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex justify-between items-center">
                          <div className="flex flex-col">
                             <span className="text-white font-bold">{week.label}</span>
                             <span className="text-slate-500 text-xs mt-0.5">{week.liters} {week.liters === 1 ? 'Litro vendido' : 'Litros vendidos'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <div className="px-3 py-1 bg-slate-900 rounded-lg border border-slate-700">
                                <span className="text-green-400 font-bold">{formatCurrency(week.value)}</span>
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
               )}
             </div>

          </div>
        )}

        {/* --- TAB: SETTINGS --- */}
        {activeTab === 'SETTINGS' && (
          <div className="space-y-6 animate-fade-in">
             <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
               <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-blue-600/20 rounded-lg text-blue-400">
                   <DollarSign size={24} />
                 </div>
                 <div>
                    <h2 className="text-lg font-bold text-white">Configuração de Preços</h2>
                    <p className="text-slate-400 text-sm">Defina os valores das tabelas</p>
                 </div>
               </div>

               <div className="space-y-5">
                 
                 {/* Standard Price */}
                 <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
                   <label className="block text-sm font-medium text-blue-400 mb-2">Preço Padrão (R$)</label>
                   <input 
                      type="number" 
                      step="0.01"
                      className="w-full p-4 bg-slate-800 border border-slate-600 rounded-lg text-white text-xl font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={standardPriceInput}
                      onChange={(e) => setStandardPriceInput(e.target.value)}
                   />
                   <p className="text-xs text-slate-500 mt-2">Usado pela maioria dos clientes.</p>
                 </div>

                 {/* Custom Price */}
                 <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
                   <div className="flex items-center gap-2 mb-2">
                      <Tag size={16} className="text-purple-400" />
                      <label className="block text-sm font-medium text-purple-400">Preço Personalizado (R$)</label>
                   </div>
                   <input 
                      type="number" 
                      step="0.01"
                      className="w-full p-4 bg-slate-800 border border-slate-600 rounded-lg text-white text-xl font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      value={customPriceInput}
                      onChange={(e) => setCustomPriceInput(e.target.value)}
                   />
                   <p className="text-xs text-slate-500 mt-2">Valor alternativo selecionável no cadastro do cliente.</p>
                 </div>
                 
                 <button 
                   onClick={handleSavePrices}
                   className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-blue-900/40 mt-2"
                 >
                   Salvar Alterações
                 </button>
               </div>
             </div>

             <div className="text-center p-4">
               <p className="text-slate-600 text-sm">Nottai v2.2.0</p>
             </div>
          </div>
        )}

      </main>

      {/* BOTTOM NAVIGATION BAR - Fintech Style */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)] px-2 pb-6 pt-2">
        <div className="flex justify-around items-center max-w-lg mx-auto w-full">
          
          {/* Item 1: Clients */}
          <button 
            onClick={() => { setActiveTab('CLIENTS'); setClientView('LIST'); }}
            className={`relative flex flex-col items-center justify-center w-16 h-16 transition-all duration-300 group ${
                activeTab === 'CLIENTS' 
                ? 'text-blue-400' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {activeTab === 'CLIENTS' && (
              <span className="absolute -top-2 w-8 h-1 bg-blue-500 rounded-b-full shadow-[0_2px_10px_rgba(59,130,246,0.6)] animate-fade-in" />
            )}
            <Users size={24} strokeWidth={activeTab === 'CLIENTS' ? 2.5 : 1.5} className="mb-1 transition-transform group-active:scale-90" />
            <span className="text-[10px] font-medium tracking-wide">Clientes</span>
          </button>
          
          {/* Item 2: Payments */}
          <button 
            onClick={() => setActiveTab('PAYMENTS')}
            className={`relative flex flex-col items-center justify-center w-16 h-16 transition-all duration-300 group ${
                activeTab === 'PAYMENTS' 
                ? 'text-blue-400' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {activeTab === 'PAYMENTS' && (
              <span className="absolute -top-2 w-8 h-1 bg-blue-500 rounded-b-full shadow-[0_2px_10px_rgba(59,130,246,0.6)] animate-fade-in" />
            )}
            <CustomPaymentIcon size={24} strokeWidth={activeTab === 'PAYMENTS' ? 2.5 : 1.5} className="mb-1 transition-transform group-active:scale-90" />
            <span className="text-[10px] font-medium tracking-wide">Pagamentos</span>
          </button>

          {/* Item 3: Reports */}
          <button 
            onClick={() => setActiveTab('REPORTS')}
            className={`relative flex flex-col items-center justify-center w-16 h-16 transition-all duration-300 group ${
                activeTab === 'REPORTS' 
                ? 'text-blue-400' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {activeTab === 'REPORTS' && (
              <span className="absolute -top-2 w-8 h-1 bg-blue-500 rounded-b-full shadow-[0_2px_10px_rgba(59,130,246,0.6)] animate-fade-in" />
            )}
            <TrendingUp size={24} strokeWidth={activeTab === 'REPORTS' ? 2.5 : 1.5} className="mb-1 transition-transform group-active:scale-90" />
            <span className="text-[10px] font-medium tracking-wide">Relatórios</span>
          </button>
          
          {/* Item 4: Settings */}
          <button 
            onClick={() => setActiveTab('SETTINGS')}
            className={`relative flex flex-col items-center justify-center w-16 h-16 transition-all duration-300 group ${
                activeTab === 'SETTINGS' 
                ? 'text-blue-400' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {activeTab === 'SETTINGS' && (
              <span className="absolute -top-2 w-8 h-1 bg-blue-500 rounded-b-full shadow-[0_2px_10px_rgba(59,130,246,0.6)] animate-fade-in" />
            )}
            <SettingsIcon size={24} strokeWidth={activeTab === 'SETTINGS' ? 2.5 : 1.5} className="mb-1 transition-transform group-active:scale-90" />
            <span className="text-[10px] font-medium tracking-wide">Ajustes</span>
          </button>
          
        </div>
      </div>

      {/* Modals */}
      <AddClientModal 
        isOpen={isClientModalOpen} 
        onClose={() => setIsClientModalOpen(false)} 
        onSave={handleSaveClient}
        initialData={editingClient}
        existingNames={clients.map(c => c.name)}
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
        title="Excluir Cliente"
        message="Tem certeza que deseja excluir este cliente? Todo o histórico de vendas será perdido."
        isDanger
      />

      <ConfirmModal
        isOpen={!!saleToDeleteId}
        onClose={() => setSaleToDeleteId(null)}
        onConfirm={confirmDeleteSale}
        title="Excluir Venda"
        message="Deseja remover este registro de venda?"
        isDanger
      />

      <ConfirmModal
        isOpen={!!paymentToDeleteId}
        onClose={() => setPaymentToDeleteId(null)}
        onConfirm={confirmDeletePayment}
        title="Excluir Pagamento"
        message="Deseja remover este registro de pagamento do histórico?"
        isDanger
      />
    </div>
  );
}

export default App;