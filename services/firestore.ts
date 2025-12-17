
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
// CORREÇÃO 1: O caminho para a configuração do Firebase foi corrigido.
// Estava importando de './firebase', mas o arquivo correto está em '../src/services/firebase'.
import { db } from '../src/services/firebase'; 
import { Client, Sale, Payment, PriceSettings } from '../types';

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
      // CORREÇÃO 2: Incluindo o ID do documento nos dados do cliente.
      // O ID é crucial para saber qual documento atualizar ou deletar depois.
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
      // CORREÇÃO 2: Incluindo o ID do documento nos dados da venda.
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
      // CORREÇÃO 2: Incluindo o ID do documento nos dados do pagamento.
      const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Payment);
      callback(payments);
    });
  },

  // CORREÇÃO 3: Lógica de pagamento corrigida e completada.
  // A função agora aceita os IDs das vendas a serem quitadas.
  // Ela usa uma 'batch' para garantir que o pagamento seja salvo e as vendas
  // sejam excluídas em uma única operação atômica. Isso evita inconsistências.
  savePayment: async (payment: Payment, saleIdsToDelete: string[]) => {
    const batch = writeBatch(db);
    
    // 1. Adiciona o novo documento de pagamento
    const paymentRef = doc(db, PAYMENTS, payment.id);
    batch.set(paymentRef, payment);

    // 2. Apaga as vendas que foram pagas
    saleIdsToDelete.forEach(id => {
        const saleRef = doc(db, SALES, id);
        batch.delete(saleRef);
    });

    // 3. Executa a operação atômica
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
