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
