import React, { useState, useRef, useEffect } from 'react';
import { X, Minus, Plus, AlertTriangle, CheckCircle, Camera, Trash2, FileText, Share2, Tag } from 'lucide-react';
import { Client, PriceType, PriceSettings } from '../types';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-850 shrink-0">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Confirm Action Modal ---

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", cancelText = "Cancelar", isDanger = false 
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <div className="flex items-start gap-4">
           {isDanger && (
             <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 shrink-0">
               <Trash2 size={24} />
             </div>
           )}
           <p className="text-slate-300 text-lg leading-relaxed pt-1">{message}</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-3 px-4 text-white rounded-lg font-semibold transition-colors shadow-lg ${
              isDanger 
                ? 'bg-red-600 hover:bg-red-500 shadow-red-900/50' 
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/50'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// --- Add/Edit Client Modal ---

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, phone: string, priceType: PriceType, avatar?: string) => void;
  initialData?: Client | null;
  existingNames: string[];
  priceSettings: PriceSettings;
}

export const AddClientModal: React.FC<AddClientModalProps> = ({ isOpen, onClose, onSave, initialData, existingNames, priceSettings }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [priceType, setPriceType] = useState<PriceType>('STANDARD');
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setPhone(initialData.phone);
        setAvatar(initialData.avatar);
        setPriceType(initialData.priceType || 'STANDARD');
      } else {
        setName('');
        setPhone('');
        setAvatar(undefined);
        setPriceType('STANDARD');
      }
      setError('');
    }
  }, [isOpen, initialData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log("AddClientModal: handleSubmit foi chamado VIA ONCLICK!");
    e.preventDefault();
    const cleanName = name.trim();
    
    if (!cleanName) {
      console.log("AddClientModal: Nome vazio, parando a submissão.");
      setError('O campo Nome é obrigatório.');
      return;
    }

    const isDuplicate = existingNames.some(
      n => n.toLowerCase() === cleanName.toLowerCase() && n.toLowerCase() !== initialData?.name.toLowerCase()
    );

    if (isDuplicate) {
      setError('Já existe um cliente com este nome.');
      console.log("AddClientModal: Nome duplicado, parando a submissão.");
      return;
    }

    console.log("AddClientModal: Chamando onSave...");
    onSave(cleanName, phone, priceType, avatar);
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Editar Cliente" : "Novo Cliente"}>
      <div className="space-y-4">
        <div className="flex flex-col items-center mb-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="relative h-24 w-24 rounded-full bg-slate-700 border-2 border-dashed border-slate-500 hover:border-blue-500 cursor-pointer flex items-center justify-center overflow-hidden transition-all group"
          >
            {avatar ? (
              <img src={avatar} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              <Camera size={32} className="text-slate-400 group-hover:text-blue-400" />
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-white font-medium">Alterar</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Toque para adicionar foto</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Nome</label>
          <input
            type="text"
            required
            autoFocus
            className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Ex: Dona Maria"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Telefone (Whatsapp)</label>
          <input
            type="tel"
            className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="DDD + Número"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Tabela de Preço</label>
          <div className="grid grid-cols-2 gap-3">
             <button
                type="button"
                onClick={() => setPriceType('STANDARD')}
                className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                  priceType === 'STANDARD'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                    : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'
                }`}
             >
                <span className="text-sm font-semibold">Padrão</span>
                <span className="text-xs">{formatCurrency(priceSettings.standard)}/L</span>
             </button>

             <button
                type="button"
                onClick={() => setPriceType('CUSTOM')}
                className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                  priceType === 'CUSTOM'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                    : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'
                }`}
             >
                <div className="flex items-center gap-1">
                   <Tag size={12} />
                   <span className="text-sm font-semibold">Personalizado</span>
                </div>
                <span className="text-xs">{formatCurrency(priceSettings.custom)}/L</span>
             </button>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onClose} // <<<<<<< AQUI ESTÁ A MUDANÇA
            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/50"
          >
            Salvar
          </button>
        </div>
      </div>
    </Modal>
  );
};

// --- Add Sale Modal ---

interface AddSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (liters: number, date: string) => void;
  currentPrice: number;
}

export const AddSaleModal: React.FC<AddSaleModalProps> = ({ isOpen, onClose, onSave, currentPrice }) => {
  const [liters, setLiters] = useState('1');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const litersNum = parseFloat(liters);
    if (!isNaN(litersNum) && litersNum > 0) {
      onSave(litersNum, date);
      setLiters('1');
      setDate(new Date().toISOString().split('T')[0]); 
      onClose();
    }
  };

  const handleIncrement = () => {
    setLiters(prev => {
      const val = parseFloat(prev) || 0;
      return String(val + 1);
    });
  };

  const handleDecrement = () => {
    setLiters(prev => {
      const val = parseFloat(prev) || 0;
      if (val <= 1) return '1';
      return String(val - 1);
    });
  };

  const calculatedTotal = liters ? (parseFloat(liters) * currentPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adicionar Venda">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Data</label>
          <input
            type="date"
            required
            className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Litros</label>
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={handleDecrement}
              className="p-3 rounded-lg bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white transition-colors active:bg-slate-800"
            >
              <Minus size={24} />
            </button>
            
            <div className="relative flex-1">
               <input
                type="number"
                step="1"
                min="1"
                required
                className="w-full p-3 text-center rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none text-xl font-bold"
                placeholder="1"
                value={liters}
                onChange={(e) => setLiters(e.target.value)}
              />
              <span className="absolute right-4 top-3.5 text-slate-400 font-medium text-sm">L</span>
            </div>

            <button 
              type="button"
              onClick={handleIncrement}
              className="p-3 rounded-lg bg-slate-700 border border-slate-600 text-blue-400 hover:bg-slate-600 hover:text-blue-300 transition-colors active:bg-slate-800"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>

        <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-700 text-center">
          <p className="text-sm text-slate-400">Total a Pagar</p>
          <p className="text-3xl font-bold text-green-400 mt-1">{calculatedTotal}</p>
          <p className="text-xs text-slate-500 mt-1">({currentPrice.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} por litro)</p>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/50"
          >
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  );
};

// --- Pay Debt Modal ---

interface PayDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  clientName: string;
  totalValue: number;
}

export const PayDebtModal: React.FC<PayDebtModalProps> = ({ isOpen, onClose, onConfirm, clientName, totalValue }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Pagamento">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
           <div className="h-16 w-16 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
             <CheckCircle size={32} />
           </div>
        </div>

        <div>
          <p className="text-slate-300 mb-2">Total a receber de <span className="text-white font-bold">{clientName}</span>:</p>
          <p className="text-4xl font-bold text-white">
            {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-left flex gap-3">
          <AlertTriangle className="text-yellow-500 shrink-0" size={20} />
          <p className="text-sm text-yellow-200/80">
            Ao confirmar, o saldo será zerado e um registro será criado na aba de <strong>Pagamentos</strong>.
          </p>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-500 transition-colors shadow-lg shadow-green-900/50"
          >
            Receber
          </button>
        </div>
      </div>
    </Modal>
  );
};

// --- Success Receipt Modal ---

interface SuccessReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: () => void;
  clientName: string;
}

export const SuccessReceiptModal: React.FC<SuccessReceiptModalProps> = ({ isOpen, onClose, onGenerate, clientName }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pagamento Registrado!">
      <div className="text-center space-y-6">
        <div className="flex justify-center animate-bounce-short">
           <div className="h-20 w-20 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-500 border-4 border-blue-500/10">
             <FileText size={40} />
           </div>
        </div>

        <div>
          <h3 className="text-xl font-bold text-white mb-2">Tudo certo!</h3>
          <p className="text-slate-400">
            O pagamento de <span className="text-white font-semibold">{clientName}</span> foi salvo com sucesso.
          </p>
          <p className="text-slate-500 text-sm mt-2">Deseja gerar o comprovante PDF agora?</p>
        </div>

        <div className="flex flex-col gap-3 mt-6">
          <button
            type="button"
            onClick={onGenerate}
            className="w-full py-3.5 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2"
          >
            <Share2 size={20} />
            Baixar Comprovante
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 text-slate-400 font-medium hover:text-white transition-colors"
          >
            Agora não, obrigado
          </button>
        </div>
      </div>
    </Modal>
  );
};
