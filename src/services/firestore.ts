
import { CapacitorFirebaseFirestore } from '@capacitor-firebase/firestore';
import { Client, Sale, Payment, PriceSettings } from '../../types';

// Coleções
const CLIENTS = 'clients';
const SALES = 'sales';
const PAYMENTS = 'payments';
const SETTINGS = 'settings';

export const firestoreService = {
  // --- Funções de Clientes ---
  listenToClients: (callback: (clients: Client[]) => void) => {
    const listener = CapacitorFirebaseFirestore.addSnapshotListener<{ id: string } & Omit<Client, 'id'>>(
      { reference: CLIENTS },
      (event, error) => {
        if (error || !event) {
          console.error('listenToClients falhou', error);
          return;
        }
        const clients = event.documents.map(doc => ({ ...doc.data(), id: doc.id }));
        callback(clients);
      }
    );
    return () => listener.then(l => l.remove());
  },

  saveClient: async (client: Client) => {
    const { id, ...clientData } = client;
    await CapacitorFirebaseFirestore.setDocument({
      reference: `${CLIENTS}/${id}`,
      data: clientData,
      merge: true,
    });
  },

  deleteClient: async (clientId: string) => {
    await CapacitorFirebaseFirestore.deleteDocument({
      reference: `${CLIENTS}/${clientId}`,
    });
  },

  // --- Funções de Vendas ---
  listenToSales: (callback: (sales: Sale[]) => void) => {
    const listener = CapacitorFirebaseFirestore.addSnapshotListener<{ id: string } & Omit<Sale, 'id'>>(
      { reference: SALES },
      (event, error) => {
        if (error || !event) {
          console.error('listenToSales falhou', error);
          return;
        }
        const sales = event.documents.map(doc => ({ ...doc.data(), id: doc.id }));
        callback(sales);
      }
    );
    return () => listener.then(l => l.remove());
  },

  saveSale: async (sale: Sale) => {
    const { id, ...saleData } = sale;
    await CapacitorFirebaseFirestore.setDocument({
      reference: `${SALES}/${id}`,
      data: saleData,
      merge: true,
    });
  },
  
  deleteSale: async (saleId: string) => {
    await CapacitorFirebaseFirestore.deleteDocument({
      reference: `${SALES}/${saleId}`,
    });
  },

  // --- Funções de Pagamentos ---
  listenToPayments: (callback: (payments: Payment[]) => void) => {
    const listener = CapacitorFirebaseFirestore.addSnapshotListener<{ id: string } & Omit<Payment, 'id'>>(
      { reference: PAYMENTS },
      (event, error) => {
        if (error || !event) {
          console.error('listenToPayments falhou', error);
          return;
        }
        const payments = event.documents.map(doc => ({ ...doc.data(), id: doc.id }));
        callback(payments);
      }
    );
    return () => listener.then(l => l.remove());
  },

  savePayment: async (payment: Payment, saleIdsToDelete: string[]) => {
    const { id: paymentId, ...paymentData } = payment;
    const operations: any[] = [
      {
        type: 'set',
        reference: `${PAYMENTS}/${paymentId}`,
        data: paymentData,
      },
    ];
    saleIdsToDelete.forEach(id => {
      operations.push({
        type: 'delete',
        reference: `${SALES}/${id}`,
      });
    });
    await CapacitorFirebaseFirestore.writeBatch({ operations });
  },

  deletePayment: async (paymentId: string) => {
    await CapacitorFirebaseFirestore.deleteDocument({
      reference: `${PAYMENTS}/${paymentId}`,
    });
  },

  // --- Funções de Configurações de Preço ---
  listenToPriceSettings: (callback: (settings: PriceSettings | null) => void) => {
    const listener = CapacitorFirebaseFirestore.addSnapshotListener<PriceSettings>(
      { reference: SETTINGS },
      (event, error) => {
        if (error || !event) {
          console.error('listenToPriceSettings falhou', error);
          callback(null);
          return;
        }
        const priceDoc = event.documents.find(doc => doc.id === 'price');
        if (priceDoc) {
          callback(priceDoc.data());
        }
      }
    );
    return () => listener.then(l => l.remove());
  },

  savePriceSettings: async (settings: PriceSettings) => {
    await CapacitorFirebaseFirestore.setDocument({
      reference: `${SETTINGS}/price`,
      data: settings,
      merge: true,
    });
  }
};
