
import { collection, getDocs, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase'; // Sua configuração do Firebase
import { Client, Sale, Payment, PriceSettings } from '../types';

// Coleções
const CLIENTS = 'clients';
const SALES = 'sales';
const PAYMENTS = 'payments';
const SETTINGS = 'settings';

export const firestoreService = {
  // --- Funções de Clientes ---

  // Escuta por atualizações em tempo real na coleção de clientes
  listenToClients: (callback: (clients: Client[]) => void) => {
    const clientsCollection = collection(db, CLIENTS);
    return onSnapshot(clientsCollection, snapshot => {
      const clients = snapshot.docs.map(doc => doc.data() as Client);
      callback(clients);
    });
  },

  // Salva (cria ou atualiza) um cliente
  saveClient: async (client: Client) => {
    const clientRef = doc(db, CLIENTS, client.id);
    await setDoc(clientRef, client, { merge: true });
  },

  // Apaga um cliente
  deleteClient: async (clientId: string) => {
    const clientRef = doc(db, CLIENTS, clientId);
    await deleteDoc(clientRef);
  },

  // --- Funções de Vendas ---

  // Escuta por atualizações em tempo real
  listenToSales: (callback: (sales: Sale[]) => void) => {
    const salesCollection = collection(db, SALES);
    return onSnapshot(salesCollection, snapshot => {
      const sales = snapshot.docs.map(doc => doc.data() as Sale);
      callback(sales);
    });
  },

  // Salva uma venda
  saveSale: async (sale: Sale) => {
    const saleRef = doc(db, SALES, sale.id);
    await setDoc(saleRef, sale, { merge: true });
  },
  
  // Apaga uma única venda
  deleteSale: async (saleId: string) => {
    const saleRef = doc(db, SALES, saleId);
    await deleteDoc(saleRef);
  },

  // Apaga múltiplas vendas (usado ao apagar um cliente)
  deleteSales: async (saleIds: string[]) => {
      if (saleIds.length === 0) return;
      const batch = writeBatch(db);
      saleIds.forEach(id => {
          const saleRef = doc(db, SALES, id);
          batch.delete(saleRef);
      });
      await batch.commit();
  },

  // --- Funções de Pagamentos ---

  // Escuta por atualizações em tempo real
  listenToPayments: (callback: (payments: Payment[]) => void) => {
    const paymentsCollection = collection(db, PAYMENTS);
    return onSnapshot(paymentsCollection, snapshot => {
      const payments = snapshot.docs.map(doc => doc.data() as Payment);
      callback(payments);
    });
  },

  // Salva um pagamento
  savePayment: async (payment: Payment) => {
    const paymentRef = doc(db, PAYMENTS, payment.id);
    await setDoc(paymentRef, payment, { merge: true });
  },

  // Apaga um único pagamento
  deletePayment: async (paymentId: string) => {
    const paymentRef = doc(db, PAYMENTS, paymentId);
    await deleteDoc(paymentRef);
  },

  // Apaga múltiplos pagamentos (usado ao apagar um cliente)
  deletePayments: async (paymentIds: string[]) => {
    if (paymentIds.length === 0) return;
    const batch = writeBatch(db);
    paymentIds.forEach(id => {
        const paymentRef = doc(db, PAYMENTS, id);
        batch.delete(paymentRef);
    });
    await batch.commit();
  },

  // --- Funções de Configurações de Preço ---

  // Escuta por atualizações de configurações
  listenToPriceSettings: (callback: (settings: PriceSettings) => void) => {
    const settingsDoc = doc(db, SETTINGS, 'price');
    return onSnapshot(settingsDoc, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as PriceSettings);
      }
    });
  },

  // Salva as configurações de preço
  savePriceSettings: async (settings: PriceSettings) => {
    const settingsRef = doc(db, SETTINGS, 'price');
    await setDoc(settingsRef, settings, { merge: true });
  }
};
