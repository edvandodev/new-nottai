import { FirebaseFirestore } from '@capacitor-firebase/firestore'
import { Client, Sale, Payment, PriceSettings } from '../types'

const CLIENTS = 'clients'
const SALES = 'sales'
const PAYMENTS = 'payments'
const SETTINGS = 'settings'

export const firestoreService = {
  listenToClients: (callback: (clients: Client[]) => void) => {
    let callbackId: string | null = null
    let cancelled = false

    ;(async () => {
      callbackId = await FirebaseFirestore.addCollectionSnapshotListener<
        Omit<Client, 'id'>
      >({ reference: CLIENTS }, (event, error) => {
        if (cancelled) return
        if (error || !event) {
          console.error('listenToClients falhou', error)
          return
        }

        const clients = event.snapshots.map(
          (s) => ({ ...(s.data ?? {}), id: s.id } as Client)
        )
        callback(clients)
      })
    })()

    return async () => {
      cancelled = true
      if (callbackId) {
        await FirebaseFirestore.removeSnapshotListener({ callbackId })
      }
    }
  },

  saveClient: async (client: Client) => {
    console.log('[DEBUG] firestore.ts: saveClient iniciada.');
    try {
      const { id, ...clientData } = client;
      console.log(`[DEBUG] firestore.ts: Tentando salvar documento em ${CLIENTS}/${id}`);
      console.log('[DEBUG] firestore.ts: Dados do cliente:', JSON.stringify(clientData, null, 2));
      
      await FirebaseFirestore.setDocument({
        reference: `${CLIENTS}/${id}`,
        data: clientData,
        merge: true
      });

      console.log('[DEBUG] firestore.ts: setDocument completado com sucesso!');
    } catch (error) {
      console.error('[DEBUG] firestore.ts: ERRO em saveClient:', error);
      throw error;
    }
  },

  deleteClient: async (clientId: string) => {
    await FirebaseFirestore.deleteDocument({
      reference: `${CLIENTS}/${clientId}`
    })
  },

  listenToSales: (callback: (sales: Sale[]) => void) => {
    let callbackId: string | null = null
    let cancelled = false

    ;(async () => {
      callbackId = await FirebaseFirestore.addCollectionSnapshotListener<
        Omit<Sale, 'id'>
      >({ reference: SALES }, (event, error) => {
        if (cancelled) return
        if (error || !event) {
          console.error('listenToSales falhou', error)
          return
        }
        const sales = event.snapshots.map(
          (s) => ({ ...(s.data ?? {}), id: s.id } as Sale)
        )
        callback(sales)
      })
    })()

    return async () => {
      cancelled = true
      if (callbackId) {
        await FirebaseFirestore.removeSnapshotListener({ callbackId })
      }
    }
  },

  saveSale: async (sale: Sale) => {
    const { id, ...saleData } = sale
    await FirebaseFirestore.setDocument({
      reference: `${SALES}/${id}`,
      data: saleData,
      merge: true
    })
  },

  deleteSale: async (saleId: string) => {
    await FirebaseFirestore.deleteDocument({
      reference: `${SALES}/${saleId}`
    })
  },

  listenToPayments: (callback: (payments: Payment[]) => void) => {
    let callbackId: string | null = null
    let cancelled = false

    ;(async () => {
      callbackId = await FirebaseFirestore.addCollectionSnapshotListener<
        Omit<Payment, 'id'>
      >({ reference: PAYMENTS }, (event, error) => {
        if (cancelled) return
        if (error || !event) {
          console.error('listenToPayments falhou', error)
          return
        }
        const payments = event.snapshots.map(
          (s) => ({ ...(s.data ?? {}), id: s.id } as Payment)
        )
        callback(payments)
      })
    })()

    return async () => {
      cancelled = true
      if (callbackId) {
        await FirebaseFirestore.removeSnapshotListener({ callbackId })
      }
    }
  },

  savePayment: async (payment: Payment, saleIdsToDelete: string[]) => {
    const { id: paymentId, ...paymentData } = payment

    const operations = [
      {
        type: 'set' as const,
        reference: `${PAYMENTS}/${paymentId}`,
        data: paymentData
      },
      ...saleIdsToDelete.map((id) => ({
        type: 'delete' as const,
        reference: `${SALES}/${id}`
      }))
    ]

    await FirebaseFirestore.writeBatch({ operations })
  },

  deletePayment: async (paymentId: string) => {
    await FirebaseFirestore.deleteDocument({
      reference: `${PAYMENTS}/${paymentId}`
    })
  },

  listenToPriceSettings: (
    callback: (settings: PriceSettings | null) => void
  ) => {
    let callbackId: string | null = null
    let cancelled = false

    ;(async () => {
      callbackId =
        await FirebaseFirestore.addCollectionSnapshotListener<PriceSettings>(
          { reference: SETTINGS },
          (event, error) => {
            if (cancelled) return
            if (error || !event) {
              console.error('listenToPriceSettings falhou', error)
              callback(null)
              return
            }

            const priceDoc = event.snapshots.find((s) => s.id === 'price')
            callback(priceDoc?.data ?? null)
          }
        )
    })()

    return async () => {
      cancelled = true
      if (callbackId) {
        await FirebaseFirestore.removeSnapshotListener({ callbackId })
      }
    }
  },

  savePriceSettings: async (settings: PriceSettings) => {
    await FirebaseFirestore.setDocument({
      reference: `${SETTINGS}/price`,
      data: settings,
      merge: true
    })
  }
}
