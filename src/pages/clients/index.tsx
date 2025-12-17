
import React, { useState, useMemo } from 'react';
import { Client, Sale, Payment } from '@/types';
import { Plus, Search, ArrowLeft, Edit, Users, ShoppingCart, DollarSign, Trash2 } from 'lucide-react';

interface ClientsPageProps {
  clients: Client[];
  sales: Sale[];
  payments: Payment[];
  clientBalances: Map<string, number>;
  onAddClient: () => void;
  onEditClient: (client: Client) => void;
  onAddSale: (clientId: string) => void;
  onPayDebt: (clientId: string) => void;
  onDeleteSale: (saleId: string) => void;
  onDeletePayment: (paymentId: string) => void;
}

export function ClientsPage({
  clients,
  sales,
  payments,
  clientBalances,
  onAddClient,
  onEditClient,
  onAddSale,
  onPayDebt,
  onDeleteSale,
  onDeletePayment,
}: ClientsPageProps) {
  const [view, setView] = useState<'LIST' | 'DETAILS'>('LIST');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = useMemo(() => {
    return clients
      .map(client => ({ ...client, balance: clientBalances.get(client.id) || 0 }))
      .filter(client => client.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, clientBalances, searchTerm]);

  const selectedClient = useMemo(() => clients.find(c => c.id === selectedClientId), [clients, selectedClientId]);

  const selectedClientHistory = useMemo(() => {
    if (!selectedClientId) return [];
    const clientSales = sales.filter(s => s.clientId === selectedClientId).map(s => ({ ...s, type: 'sale' as const }));
    const clientPayments = payments.filter(p => p.clientId === selectedClientId).map(p => ({ ...p, type: 'payment' as const }));
    return [...clientSales, ...clientPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, payments, selectedClientId]);

  const renderClientList = () => (
    <>
      <header className='sticky top-0 z-30 bg-slate-950/80 backdrop-blur-sm p-4'>
        <div className='flex justify-between items-center mb-4'>
          <h1 className='text-3xl font-bold text-slate-100 tracking-tight'>Clientes</h1>
          <button onClick={onAddClient} className='bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-full shadow-lg transition-transform active:scale-95'>
            <Plus size={20} />
          </button>
        </div>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-500' size={20} />
          <input type='text' placeholder='Buscar cliente...' value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className='w-full bg-slate-800/80 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500' />
        </div>
      </header>
      <div className='p-4 space-y-3'>
        {filteredClients.map(client => (
          <div key={client.id} onClick={() => { setSelectedClientId(client.id); setView('DETAILS'); }} className='bg-slate-900 rounded-2xl p-4 flex justify-between items-center shadow-md transition-all hover:bg-slate-800/50 active:scale-[0.98] border border-slate-800'>
            <div className='flex items-center'>
              <div className='p-3 bg-slate-800 rounded-full mr-4'><Users className='text-slate-400' size={20} /></div>
              <div>
                <p className='font-semibold text-lg text-slate-200'>{client.name}</p>
                <p className={`text-sm ${client.balance > 0 ? 'text-amber-400' : 'text-slate-400'}`}>{`Saldo: R$ ${client.balance.toFixed(2)}`}</p>
              </div>
            </div>
            <div className={`text-lg font-bold ${client.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>{client.balance > 0 ? `R$ ${client.balance.toFixed(2)}` : 'Em dia'}</div>
          </div>
        ))}
      </div>
    </>
  );

  const renderClientDetails = () => {
    if (!selectedClient) return null;
    const balance = clientBalances.get(selectedClient.id) || 0;
    return (
      <>
        <header className='sticky top-0 z-30 flex items-center gap-4 bg-slate-950/80 backdrop-blur-sm p-4 border-b border-slate-800'>
          <button onClick={() => setView('LIST')} className='p-2 rounded-full hover:bg-slate-800'><ArrowLeft size={22} /></button>
          <h1 className='text-xl font-bold text-slate-100 tracking-tight truncate'>{selectedClient.name}</h1>
          <button onClick={() => onEditClient(selectedClient)} className='ml-auto p-2 rounded-full hover:bg-slate-800'><Edit size={20} /></button>
        </header>
        <div className='p-4'>
          <div className='bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center mb-4'>
            <p className='text-sm text-slate-400 mb-1'>Saldo Devedor</p>
            <p className={`text-4xl font-bold ${balance > 0 ? 'text-red-500' : 'text-green-500'}`}>{`R$ ${balance.toFixed(2)}`}</p>
          </div>
          <div className='grid grid-cols-2 gap-4 mb-6'>
            <button onClick={() => onAddSale(selectedClient.id)} className='flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-transform active:scale-95'><ShoppingCart size={18}/>Adicionar Venda</button>
            <button onClick={() => onPayDebt(selectedClient.id)} disabled={balance <= 0} className='flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-xl transition-transform active:scale-95 disabled:bg-slate-700 disabled:text-slate-400 disabled:scale-100'><DollarSign size={18}/>Receber Pagamento</button>
          </div>
          <h2 className='text-lg font-semibold mb-3 tracking-tight'>Histórico</h2>
          <div className='space-y-3'>
            {selectedClientHistory.length > 0 ? selectedClientHistory.map(item => (
              <div key={`${item.type}-${item.id}`} className='bg-slate-900 rounded-xl p-4 flex justify-between items-center border border-slate-800'>
                <div className='flex items-center gap-4'>
                   <div className={`p-2 rounded-full ${item.type === 'sale' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>
                      {item.type === 'sale' ? <ShoppingCart size={20}/> : <DollarSign size={20}/>}
                   </div>
                   <div>
                      <p className='font-semibold text-slate-200'>{item.type === 'sale' ? `${item.liters} Litros de Leite` : 'Pagamento Recebido'}</p>
                      <p className='text-sm text-slate-400'>{new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                   </div>
                </div>
                <div className='flex items-center gap-2'>
                    <p className={`font-bold text-lg ${item.type === 'sale' ? 'text-red-500' : 'text-green-400'}`}>{item.type === 'sale' ? `- R$ ${item.totalValue.toFixed(2)}` : `+ R$ ${item.amount.toFixed(2)}`}</p>
                    <button onClick={() => item.type === 'sale' ? onDeleteSale(item.id) : onDeletePayment(item.id)} className='p-2 text-slate-500 hover:text-red-500 rounded-full hover:bg-red-500/10'><Trash2 size={18} /></button>
                </div>
              </div>
            )) : <p className='text-center text-slate-500 py-8'>Nenhum histórico para este cliente.</p>}
          </div>
        </div>
      </>
    );
  };

  return view === 'LIST' ? renderClientList() : renderClientDetails();
}
