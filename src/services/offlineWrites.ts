import { firestoreService } from './firestore'
import { pendingQueue } from './pendingQueue'
import { optimisticStore } from './optimisticStore'
import type { Client, Payment, PriceSettings, Sale, Cow, CalvingEvent } from '@/types'

const isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine)

const enqueue = async (type: any, key: string, payload: any) => {
  await pendingQueue.enqueue({ type, key, payload })
}

const messageFromError = (error: any) =>
  (error?.message || error?.code || 'Erro').toString()

const normalizeCalvingPayload = (calving: CalvingEvent): CalvingEvent => {
  const photos = Array.isArray(calving.photos)
    ? calving.photos.filter((p): p is string => Boolean(p))
    : calving.photoDataUrl
      ? [calving.photoDataUrl]
      : []
  const photoDataUrl = calving.photoDataUrl ?? photos[0] ?? null
  return { ...calving, photos, photoDataUrl }
}

export const offlineWrites = {
  async saveClient(client: Client) {
    const action = {
      type: 'UPSERT_CLIENT' as const,
      key: `client:${client.id}`,
      payload: client,
      createdAt: Date.now()
    }
    optimisticStore.apply(action)
    try {
      if (!isOnline()) throw new Error('offline')
      await firestoreService.saveClient(client)
      optimisticStore.confirm(action.key)
    } catch (error) {
      await enqueue(action.type, action.key, action.payload)
      optimisticStore.fail(action.key, messageFromError(error))
    }
  },

  async deleteClient(clientId: string) {
    const action = {
      type: 'DELETE_CLIENT' as const,
      key: `client:${clientId}`,
      payload: clientId,
      createdAt: Date.now()
    }
    optimisticStore.apply(action)
    try {
      if (!isOnline()) throw new Error('offline')
      await firestoreService.deleteClient(clientId)
      optimisticStore.confirm(action.key)
    } catch (error) {
      await enqueue(action.type, action.key, action.payload)
      optimisticStore.fail(action.key, messageFromError(error))
    }
  },

  async saveSale(sale: Sale) {
    const action = {
      type: 'UPSERT_SALE' as const,
      key: `sale:${sale.id}`,
      payload: sale,
      createdAt: Date.now()
    }
    optimisticStore.apply(action)
    try {
      if (!isOnline()) throw new Error('offline')
      await firestoreService.saveSale(sale)
      optimisticStore.confirm(action.key)
    } catch (error) {
      await enqueue(action.type, action.key, action.payload)
      optimisticStore.fail(action.key, messageFromError(error))
    }
  },

  async deleteSale(saleId: string) {
    const action = {
      type: 'DELETE_SALE' as const,
      key: `sale:${saleId}`,
      payload: saleId,
      createdAt: Date.now()
    }
    optimisticStore.apply(action)
    try {
      if (!isOnline()) throw new Error('offline')
      await firestoreService.deleteSale(saleId)
      optimisticStore.confirm(action.key)
    } catch (error) {
      await enqueue(action.type, action.key, action.payload)
      optimisticStore.fail(action.key, messageFromError(error))
    }
  },

  async savePayment(payment: Payment, salesToMarkAsPaid: Sale[]) {
    const action = {
      type: 'UPSERT_PAYMENT' as const,
      key: `payment:${payment.id}`,
      payload: { payment, salesToMarkAsPaid },
      createdAt: Date.now()
    }
    optimisticStore.apply(action)
    try {
      if (!isOnline()) throw new Error('offline')
      await firestoreService.savePayment(payment, salesToMarkAsPaid)
      optimisticStore.confirm(action.key)
    } catch (error) {
      await enqueue(action.type, action.key, action.payload)
      optimisticStore.fail(action.key, messageFromError(error))
    }
  },

  async deletePayment(paymentId: string) {
    const action = {
      type: 'DELETE_PAYMENT' as const,
      key: `payment:${paymentId}`,
      payload: paymentId,
      createdAt: Date.now()
    }
    optimisticStore.apply(action)
    try {
      if (!isOnline()) throw new Error('offline')
      await firestoreService.deletePayment(paymentId)
      optimisticStore.confirm(action.key)
    } catch (error) {
      await enqueue(action.type, action.key, action.payload)
      optimisticStore.fail(action.key, messageFromError(error))
    }
  },

  async savePriceSettings(settings: PriceSettings) {
    const action = {
      type: 'SAVE_PRICE_SETTINGS' as const,
      key: 'settings:price',
      payload: settings,
      createdAt: Date.now()
    }
    optimisticStore.apply(action)
    try {
      if (!isOnline()) throw new Error('offline')
      await firestoreService.savePriceSettings(settings)
      optimisticStore.confirm(action.key)
    } catch (error) {
      await enqueue(action.type, action.key, action.payload)
      optimisticStore.fail(action.key, messageFromError(error))
    }
  },

  // --- Reprodução ---
  async saveCow(cow: Cow) {
    const action = {
      type: 'UPSERT_COW' as const,
      key: `cow:${cow.id}`,
      payload: cow,
      createdAt: Date.now()
    }
    optimisticStore.apply(action)
    try {
      if (!isOnline()) throw new Error('offline')
      await firestoreService.saveCow(cow)
      optimisticStore.confirm(action.key)
    } catch (error) {
      await enqueue(action.type, action.key, action.payload)
      optimisticStore.fail(action.key, messageFromError(error))
    }
  },

  async deleteCow(cowId: string) {
    const action = {
      type: 'DELETE_COW' as const,
      key: `cow:${cowId}`,
      payload: cowId,
      createdAt: Date.now()
    }
    optimisticStore.apply(action)
    try {
      if (!isOnline()) throw new Error('offline')
      await firestoreService.deleteCow(cowId)
      optimisticStore.confirm(action.key)
    } catch (error) {
      await enqueue(action.type, action.key, action.payload)
      optimisticStore.fail(action.key, messageFromError(error))
    }
  },

  async saveCalving(calving: CalvingEvent) {
    const normalizedCalving = normalizeCalvingPayload(calving)
    const action = {
      type: 'UPSERT_CALVING' as const,
      key: `calving:${normalizedCalving.id}`,
      payload: normalizedCalving,
      createdAt: Date.now()
    }
    optimisticStore.apply(action)
    try {
      if (!isOnline()) throw new Error('offline')
      await firestoreService.saveCalving(normalizedCalving)
      optimisticStore.confirm(action.key)
    } catch (error) {
      await enqueue(action.type, action.key, action.payload)
      optimisticStore.fail(action.key, messageFromError(error))
    }
  },

  async deleteCalving(calvingId: string) {
    const action = {
      type: 'DELETE_CALVING' as const,
      key: `calving:${calvingId}`,
      payload: calvingId,
      createdAt: Date.now()
    }
    optimisticStore.apply(action)
    try {
      if (!isOnline()) throw new Error('offline')
      await firestoreService.deleteCalving(calvingId)
      optimisticStore.confirm(action.key)
    } catch (error) {
      await enqueue(action.type, action.key, action.payload)
      optimisticStore.fail(action.key, messageFromError(error))
    }
  },

  _direct: {
    saveClient: (client: Client) => firestoreService.saveClient(client),
    deleteClient: (id: string) => firestoreService.deleteClient(id),
    saveSale: (sale: Sale) => firestoreService.saveSale(sale),
    deleteSale: (id: string) => firestoreService.deleteSale(id),
    savePayment: (payment: Payment, sales: Sale[]) =>
      firestoreService.savePayment(payment, sales),
    deletePayment: (id: string) => firestoreService.deletePayment(id),
    savePriceSettings: (settings: PriceSettings) =>
      firestoreService.savePriceSettings(settings),
    saveCow: (cow: Cow) => firestoreService.saveCow(cow),
    deleteCow: (id: string) => firestoreService.deleteCow(id),
    saveCalving: (calving: CalvingEvent) =>
      firestoreService.saveCalving(normalizeCalvingPayload(calving)),
    deleteCalving: (id: string) => firestoreService.deleteCalving(id)
  }
}
