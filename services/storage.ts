import { Client, Sale, Payment, PriceSettings, DEFAULT_SETTINGS } from '../types';

const CLIENTS_KEY = 'leite_app_clients';
const SALES_KEY = 'leite_app_sales';
const PAYMENTS_KEY = 'leite_app_payments';
const SETTINGS_PRICE_KEY = 'leite_app_price_settings'; // Changed key to avoid conflict with old number type

export const storageService = {
  getClients: (): Client[] => {
    try {
      const data = localStorage.getItem(CLIENTS_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      // Migration: Ensure existing clients have a priceType
      return parsed.map((c: any) => ({
        ...c,
        priceType: c.priceType || 'STANDARD'
      }));
    } catch (e) {
      console.error("Erro ao carregar clientes", e);
      return [];
    }
  },

  saveClients: (clients: Client[]) => {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  },

  getSales: (): Sale[] => {
    try {
      const data = localStorage.getItem(SALES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Erro ao carregar vendas", e);
      return [];
    }
  },

  saveSales: (sales: Sale[]) => {
    localStorage.setItem(SALES_KEY, JSON.stringify(sales));
  },

  getPayments: (): Payment[] => {
    try {
      const data = localStorage.getItem(PAYMENTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Erro ao carregar pagamentos", e);
      return [];
    }
  },

  savePayments: (payments: Payment[]) => {
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
  },

  getPriceSettings: (): PriceSettings => {
    try {
      const data = localStorage.getItem(SETTINGS_PRICE_KEY);
      if (data) {
        return JSON.parse(data);
      }
      
      // Fallback: Check for old single price key to migrate
      const oldPrice = localStorage.getItem('leite_app_price');
      if (oldPrice) {
        const val = parseFloat(oldPrice);
        return { standard: val, custom: val + 0.50 }; // Default custom is slightly higher
      }

      return DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  },

  savePriceSettings: (settings: PriceSettings) => {
    localStorage.setItem(SETTINGS_PRICE_KEY, JSON.stringify(settings));
  }
};