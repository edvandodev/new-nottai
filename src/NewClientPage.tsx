import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PriceType, DEFAULT_SETTINGS } from '../types';

interface NewClientPageProps {
  onSave: (name: string, phone: string, priceType: PriceType, avatar?: string) => Promise<void>;
}

export const NewClientPage: React.FC<NewClientPageProps> = ({ onSave }) => {
  const navigate = useNavigate();
  
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [priceType, setPriceType] = useState<PriceType>('STANDARD');
  const [customPrice, setCustomPrice] = useState<string>(''); // Mantido para compatibilidade visual/futura, mas a lógica principal usa PriceType
  const [photo, setPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handlers
  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveClick = async () => {
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      // Chama a função passada pelo App.tsx
      await onSave(name, phone, priceType, photo || undefined);
      // A navegação de volta é tratada aqui após o sucesso, ou pelo App.tsx. 
      // Como o App.tsx gerenciava o modal, aqui nós navegamos explicitamente.
      navigate(-1);
    } catch (error) {
      console.error('Error saving client', error);
      alert('Erro ao salvar cliente. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const isSaveDisabled = !name.trim() || isLoading;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col pb-safe">
      {/* 1. Header Clean */}
      <header className="px-6 pt-12 pb-4 flex items-center justify-between bg-gray-900 z-10">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
        >
          {/* Icon Back/Close */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white flex-1 text-center mr-8">
          Novo Cliente
        </h1>
      </header>

      <main className="flex-1 px-6 flex flex-col gap-6 overflow-y-auto">
        
        {/* 2. Área de Foto */}
        <div className="flex flex-col items-center justify-center mt-2">
          <div 
            onClick={handlePhotoClick}
            className={`
              relative w-28 h-28 rounded-full border-2 flex items-center justify-center cursor-pointer overflow-hidden transition-all
              ${photo ? 'border-green-500' : 'border-gray-700 bg-gray-800 hover:border-gray-500'}
            `}
          >
            {photo ? (
              <img src={photo} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center text-gray-500">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <span className="text-[10px] mt-1 font-medium">Adicionar</span>
              </div>
            )}
            
            {/* Hidden Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">Toque para alterar a foto</p>
        </div>

        {/* 3. Inputs (Pills) */}
        <div className="space-y-4">
          {/* Nome */}
          <div className="group">
            <label className="block text-xs text-gray-500 ml-4 mb-1 uppercase tracking-wider">Nome do Cliente</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-500 group-focus-within:text-green-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                placeholder="Ex: João da Silva"
                className="block w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-700 rounded-full text-white placeholder-gray-600 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div className="group">
            <label className="block text-xs text-gray-500 ml-4 mb-1 uppercase tracking-wider">WhatsApp / Telefone</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-500 group-focus-within:text-green-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </div>
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="block w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-700 rounded-full text-white placeholder-gray-600 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* 4. Opções de Preço (Segmented Control) */}
        <div className="mt-2">
          <label className="block text-xs text-gray-500 ml-4 mb-2 uppercase tracking-wider">Tabela de Preço</label>
          <div className="bg-gray-800 p-1 rounded-full flex relative">
            <button
              onClick={() => setPriceType('STANDARD')}
              className={`flex-1 py-3 rounded-full text-sm font-medium transition-all duration-200 ${
                priceType === 'STANDARD' 
                  ? 'bg-green-500 text-gray-900 shadow-lg' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Padrão
            </button>
            <button
              onClick={() => setPriceType('CUSTOM')}
              className={`flex-1 py-3 rounded-full text-sm font-medium transition-all duration-200 ${
                priceType === 'CUSTOM' 
                  ? 'bg-green-500 text-gray-900 shadow-lg' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Personalizado
            </button>
          </div>
          {priceType === 'CUSTOM' && (
             <p className="text-xs text-gray-500 mt-2 ml-4">
               O valor será definido nas configurações globais de preço personalizado.
             </p>
          )}
        </div>

      </main>

      {/* 5. Footer Actions */}
      <footer className="p-6 bg-gray-900 mt-auto">
        <button
          onClick={handleSaveClick}
          disabled={isSaveDisabled}
          className={`
            w-full py-4 rounded-full font-bold text-lg tracking-wide transition-all transform active:scale-95
            ${isSaveDisabled 
              ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
              : 'bg-green-500 text-gray-900 hover:bg-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
            }
          `}
        >
          {isLoading ? 'Salvando...' : 'Salvar Cliente'}
        </button>
        
        <button
          onClick={() => navigate(-1)}
          className="w-full py-3 mt-3 text-sm text-gray-500 font-medium hover:text-white transition-colors"
        >
          Cancelar
        </button>
      </footer>
    </div>
  );
};

export default NewClientPage;