
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
// CORREÇÃO: O caminho para a configuração do Firebase foi ajustado para o novo local.
import { db } from './firebase'; 
// CORREÇÃO: O caminho para as definições de tipo foi ajustado.
import { Client, Sale, Payment, PriceSettings } from '../../types';

// Coleções
const CLIENTS = 'clients';
const SALES = 'sales';
const PAYMENTS = 'payments';
const SETTINGS = 'settings';

export const firestoreService = {
  // --- Funções de Clientes ---

  listenToClients: (callback: (clients: Client[]) => void) => {
    const clientsCollection = collection(db, CLIENTS);
    return onSnapshot(clientsCollection, snapshot => {
      const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Client);
      callback(clients);
    });
  },

  saveClient: async (client: Client) => {
    const clientRef = doc(db, CLIENTS, client.id);
    await setDoc(clientRef, client, { merge: true });
  },

  deleteClient: async (clientId: string) => {
    const clientRef = doc(db, CLIENTS, clientId);
    await deleteDoc(clientRef);
  },

  // --- Funções de Vendas ---

  listenToSales: (callback: (sales: Sale[]) => void) => {
    const salesCollection = collection(db, SALES);
    return onSnapshot(salesCollection, snapshot => {
      const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Sale);
      callback(sales);
    });
  },

  saveSale: async (sale: Sale) => {
    const saleRef = doc(db, SALES, sale.id);
    await setDoc(saleRef, sale, { merge: true });
  },
  
  deleteSale: async (saleId: string) => {
    const saleRef = doc(db, SALES, saleId);
    await deleteDoc(saleRef);
  },

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

  listenToPayments: (callback: (payments: Payment[]) => void) => {
    const paymentsCollection = collection(db, PAYMENTS);
    return onSnapshot(paymentsCollection, snapshot => {
      const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Payment);
      callback(payments);
    });
  },

  savePayment: async (payment: Payment, saleIdsToDelete: string[]) => {
    const batch = writeBatch(db);
    
    const paymentRef = doc(db, PAYMENTS, payment.id);
    batch.set(paymentRef, payment);

    saleIdsToDelete.forEach(id => {
        const saleRef = doc(db, SALES, id);
        batch.delete(saleRef);
    });

    await batch.commit();
  },

  deletePayment: async (paymentId: string) => {
    const paymentRef = doc(db, PAYMENTS, paymentId);
    await deleteDoc(paymentRef);
  },

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

  listenToPriceSettings: (callback: (settings: PriceSettings) => void) => {
    const settingsDoc = doc(db, SETTINGS, 'price');
    return onSnapshot(settingsDoc, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as PriceSettings);
      }
    });
  },

  savePriceSettings: async (settings: PriceSettings) => {
    const settingsRef = doc(db, SETTINGS, 'price');
    await setDoc(settingsRef, settings, { merge: true });
  }
};
