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
    console.log("handleSaveClient: Função iniciada.");
    try {
      const clientToSave: Client = editingClient
        ? { ...editingClient, name, phone, priceType, avatar: avatar || editingClient.avatar }
        : { id: crypto.randomUUID(), name, phone, priceType, avatar };

      console.log("handleSaveClient: Objeto cliente preparado:", clientToSave);
      console.log("handleSaveClient: Chamando firestoreService.saveClient...");

      await firestoreService.saveClient(clientToSave);

      console.log("handleSaveClient: Chamada ao firestoreService.saveClient concluída.");
      setEditingClient(null);
      setIsClientModalOpen(false);
      console.log("handleSaveClient: Modal fechado e estado atualizado.");

    } catch (error) {
      console.error("handleSaveClient: ERRO DETECTADO:", error);
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
