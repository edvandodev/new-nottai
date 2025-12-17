import { FirebaseFirestore } from '@capacitor-firebase/firestore'
import type { Client, Sale, Payment, PriceSettings } from '@/types'

const CLIENTS = 'clients'
const SALES = 'sales'
const PAYMENTS = 'payments'
const SETTINGS = 'settings'

const stripUndefined = <T extends Record<string, any>>(obj: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>

export const firestoreService = {
  listenToClients: (callback) => {
    let cancelled = false

    const callbackIdPromise = FirebaseFirestore.addCollectionSnapshotListener(
      { reference: CLIENTS },
      (event, error) => {
        if (cancelled) return
        if (error || !event) {
          console.error('listenToClients falhou', error)
          return
        }
        const clients = event.snapshots.map((s) => ({
          ...(s.data ?? {}),
          id: s.id
        }))
        callback(clients as Client[])
      }
    )

    return async () => {
      cancelled = true
      try {
        const callbackId = await callbackIdPromise
        await FirebaseFirestore.removeSnapshotListener({ callbackId })
      } catch (e) {
        console.error('Falha ao remover listener', e)
      }
    }
  },

  saveClient: async (client: Client) => {
    const { id, ...clientDataRaw } = client

    const clientData = stripUndefined(clientDataRaw)

    await FirebaseFirestore.setDocument({
      reference: `${CLIENTS}/${id}`,
      data: clientData,
      merge: true
    })
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

  savePayment: async (payment: Payment, salesToMarkAsPaid: Sale[]) => {
    const { id: paymentId, ...paymentData } = payment

    const operations = [
      {
        type: 'set' as const,
        reference: `${PAYMENTS}/${paymentId}`,
        data: paymentData
      },
      ...salesToMarkAsPaid.map((sale) => ({
        type: 'update' as const,
        reference: `${SALES}/${sale.id}`,
        data: { isPaid: true }
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
