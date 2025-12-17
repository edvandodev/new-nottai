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
