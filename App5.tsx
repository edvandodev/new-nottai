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
