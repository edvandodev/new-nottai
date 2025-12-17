
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ChevronLeft, Trash2, Milk, User, Phone, Droplets, DollarSign, Wallet, MessageCircle, Pencil, Settings as SettingsIcon, Users, CheckCircle, Search, X, ChevronDown, ChevronUp, FileText, Download, Tag, BarChart3, Calendar, TrendingUp } from 'lucide-react';
import { Client, Sale, Payment, ViewState, TabState, DEFAULT_SETTINGS, PriceSettings, PriceType } from './types';
import { firestoreService } from './services/firestore';
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
    {/* ... (código do ícone SVG permanece o mesmo) ... */}
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
    clients.forEach(c => balances[c.id] = 0);

    sales.forEach(sale => {
      if (balances[sale.clientId] !== undefined) {
        balances[sale.clientId] += sale.totalValue;
      }
    });
    return balances;
  }, [clients, sales]);

  const totalReceivable = useMemo(() => {
    return Object.values(clientBalances).reduce((acc, curr) => acc + curr, 0);
  }, [clientBalances]);

  const lastInteractions = useMemo(() => {
    const map = new Map<string, number>();
    clients.forEach(c => map.set(c.id, 0));
    sales.forEach(s => {
        const time = new Date(s.date).getTime();
        const current = map.get(s.clientId) || 0;
        if (time > current) map.set(s.clientId, time);
    });
    payments.forEach(p => {
        const time = new Date(p.date).getTime();
        const current = map.get(p.clientId) || 0;
        if (time > current) map.set(p.clientId, time);
    });
    return map;
  }, [clients, sales, payments]);

  const filteredClients = useMemo(() => {
    let result = [...clients];
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(client =>
        client.name.toLowerCase().includes(lowerQuery) ||
        client.phone.includes(lowerQuery)
      );
    }
    return result.sort((a, b) => {
      const lastA = lastInteractions.get(a.id) || 0;
      const lastB = lastInteractions.get(b.id) || 0;
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

  const reportData = useMemo(() => {
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
    return { totalLiters, totalValue, weeks: Object.values(weeks).sort((a, b) => a.label.localeCompare(b.label)) };
  }, [sales, payments, reportYear, reportMonth]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    sales.forEach(s => years.add(new Date(s.date).getFullYear()));
    payments.forEach(p => {
      if (p.salesSnapshot) {
        p.salesSnapshot.forEach(s => years.add(new Date(s.date).getFullYear()));
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [sales, payments]);

  // --- Handlers ---

  const handleTabChange = (tab: TabState) => {
    setActiveTab(tab);
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
    setExpandedPaymentId(prev => (prev === id ? null : id));
  };

  const handleOpenAddClient = () => {
    setEditingClient(null);
    setIsClientModalOpen(true);
  };

  const handleOpenEditClient = (client: Client) => {
    setEditingClient(client);
    setIsClientModalOpen(true);
  };

  const handleSaveClient = async (name: string, phone: string, priceType: PriceType, avatar?: string) => {
    alert('Função handleSaveClient foi chamada!'); // <<< TESTE DE DEPURACAO
    try {
      const clientToSave: Client = editingClient
        ? { ...editingClient, name, phone, priceType, avatar: avatar || editingClient.avatar }
        : { id: crypto.randomUUID(), name, phone, priceType, avatar };

      await firestoreService.saveClient(clientToSave);
      setEditingClient(null);
      setIsClientModalOpen(false); // Fechar modal no sucesso
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      alert(`Ocorreu um erro ao salvar o cliente: ${error}`);
    }
  };

  const handleDeleteClient = (id: string) => setClientToDeleteId(id);

  const confirmDeleteClient = async () => {
    if (clientToDeleteId) {
      try {
        await firestoreService.deleteClient(clientToDeleteId);
        if (selectedClientId === clientToDeleteId) {
          setClientView('LIST');
          setSelectedClientId(null);
        }
        setClientToDeleteId(null);
      } catch (error) {
        console.error("Erro ao deletar cliente:", error);
        alert(`Ocorreu um erro ao deletar o cliente: ${error}`);
      }
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
      setIsSaleModalOpen(false); // Fechar modal no sucesso
    } catch (error) {
      console.error("Erro ao adicionar venda:", error);
      alert(`Ocorreu um erro ao adicionar a venda: ${error}`);
    }
  };

  const handleDeleteSale = (id: string) => setSaleToDeleteId(id);

  const confirmDeleteSale = async () => {
    if (saleToDeleteId) {
      try {
        await firestoreService.deleteSale(saleToDeleteId);
        setSaleToDeleteId(null);
      } catch (error) {
        console.error("Erro ao deletar venda:", error);
        alert(`Ocorreu um erro ao deletar a venda: ${error}`);
      }
    }
  };

  const handlePayDebt = async () => {
    if (!selectedClientId) return;
    const amount = clientBalances[selectedClientId];
    const client = clients.find(c => c.id === selectedClientId);
    if (amount > 0 && client) {
      try {
        const currentDate = new Date().toISOString();
        const salesToBePaid = sales.filter(s => s.clientId === selectedClientId);
        const newPayment: Payment = {
          id: crypto.randomUUID(),
          clientId: selectedClientId,
          clientName: client.name,
          amount: amount,
          date: currentDate,
          salesSnapshot: salesToBePaid
        };
        await firestoreService.savePayment(newPayment, salesToBePaid.map(s => s.id));

        setLastPaymentInfo({
          clientName: client.name,
          amount: amount,
          sales: salesToBePaid,
          date: currentDate
        });
        setIsReceiptModalOpen(true);
      } catch (error) {
        console.error("Erro ao registrar pagamento:", error);
        alert(`Ocorreu um erro ao registrar o pagamento: ${error}`);
      }
    }
    setIsPayModalOpen(false);
  };

  const handleGenerateReceipt = (payment?: Payment) => {
    if (payment) {
      if (payment.salesSnapshot) {
        generateReceipt(payment.clientName, payment.amount, payment.salesSnapshot, payment.date);
      } else {
        alert("Detalhes indisponíveis para este registro antigo.");
      }
      return;
    }
    if (lastPaymentInfo) {
      generateReceipt(lastPaymentInfo.clientName, lastPaymentInfo.amount, lastPaymentInfo.sales, lastPaymentInfo.date);
      setIsReceiptModalOpen(false);
    }
  };

  const handleDeletePayment = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPaymentToDeleteId(id);
  };

  const confirmDeletePayment = async () => {
    if (paymentToDeleteId) {
      try {
        await firestoreService.deletePayment(paymentToDeleteId);
        setPaymentToDeleteId(null);
      } catch (error) {
        console.error("Erro ao deletar pagamento:", error);
        alert(`Ocorreu um erro ao deletar o pagamento: ${error}`);
      }
    }
  };

  const handleSavePrices = async () => {
    const std = parseFloat(standardPriceInput.replace(',', '.'));
    const cst = parseFloat(customPriceInput.replace(',', '.'));
    if (!isNaN(std) && std >= 0 && !isNaN(cst) && cst >= 0) {
      try {
        const newSettings = { standard: std, custom: cst };
        await firestoreService.savePriceSettings(newSettings);
        alert('Preços atualizados com sucesso!');
      } catch (error) {
        console.error("Erro ao salvar preços:", error);
        alert(`Ocorreu um erro ao salvar os preços: ${error}`);
      }
    } else {
      setStandardPriceInput(priceSettings.standard.toString());
      setCustomPriceInput(priceSettings.custom.toString());
    }
  };

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

  // --- Render (JSX permanece o mesmo) ---

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-32">

      {/* ... (Todo o JSX a partir daqui permanece o mesmo, você pode colar o seu JSX aqui) ... */}
       {/* Header */}
       {!(activeTab === 'CLIENTS' && clientView === 'DETAILS') && (
        <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 shadow-md">
          {/* ... */}
        </header>
      )}

      <main className={`max-w-2xl mx-auto ${activeTab === 'CLIENTS' && clientView === 'DETAILS' ? 'p-0' : 'p-4'}`}>
        {/* ... */}
      </main>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)] px-2 pb-6 pt-2">
        {/* ... */}
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
