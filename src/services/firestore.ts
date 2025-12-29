import { FirebaseFirestore } from '@capacitor-firebase/firestore'
import type { Client, Sale, Payment, PriceSettings, Cow, CalvingEvent } from '@/types'
import { getDeviceId } from './device'

let currentUid: string | null = null
let lastSyncAt: number | null = null
const syncCallbacks = new Set<(ts: number) => void>()

const backfilledClients = new Set<string>()
const backfilledSales = new Set<string>()
const backfilledPayments = new Set<string>()
const backfilledCows = new Set<string>()
const backfilledCalvings = new Set<string>()

const requireUid = (): string => {
  if (!currentUid) {
    throw new Error('Usu\u00e1rio n\u00e3o autenticado')
  }
  return currentUid
}

const clientPath = () => `users/${requireUid()}/clients`
const salesPath = () => `users/${requireUid()}/sales`
const paymentsPath = () => `users/${requireUid()}/payments`
const cowsPath = () => `users/${requireUid()}/cows`
const calvingsPath = () => `users/${requireUid()}/calvings`
const settingsPath = () => `users/${requireUid()}/settings`

const stripUndefined = <T extends Record<string, any>>(obj: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>

const noteSync = () => {
  lastSyncAt = Date.now()
  syncCallbacks.forEach((cb) => {
    try {
      cb(lastSyncAt as number)
    } catch (error) {
      console.error('Erro ao notificar sync', error)
    }
  })
}

const backfillMeta = async (
  reference: string,
  id: string,
  data: any,
  cache: Set<string>
) => {
  if (cache.has(id)) return
  const hasMeta =
    data?.createdAt !== undefined &&
    data?.updatedAt !== undefined &&
    data?.updatedBy !== undefined &&
    data?.deviceId !== undefined
  if (hasMeta) return
  cache.add(id)
  const now = Date.now()
  const uid = currentUid || 'unknown'
  try {
    await FirebaseFirestore.updateDocument({
      reference: `${reference}/${id}`,
      data: {
        createdAt: data?.createdAt ?? now,
        updatedAt: data?.updatedAt ?? now,
        updatedBy: data?.updatedBy ?? uid,
        deviceId: data?.deviceId ?? getDeviceId()
      }
    })
  } catch (error) {
    console.error(`Falha ao backfill meta para ${reference}/${id}`, error)
  }
}

const getMetaForCreate = (uid: string) => {
  const now = Date.now()
  const deviceId = getDeviceId()
  return {
    createdAt: now,
    updatedAt: now,
    updatedBy: uid,
    deviceId
  }
}

const getMetaForUpdate = (uid: string) => {
  const now = Date.now()
  const deviceId = getDeviceId()
  return {
    updatedAt: now,
    updatedBy: uid,
    deviceId
  }
}

export const firestoreService = {
  setUser: (uid: string | null): void => {
    currentUid = uid
  },

  onSync: (cb: (ts: number) => void) => {
    syncCallbacks.add(cb)
    return () => syncCallbacks.delete(cb)
  },

  getLastSyncAt: (): number | null => lastSyncAt,

  async getDoc<T>(reference: string): Promise<T | null> {
    const result = await FirebaseFirestore.getDocument<T>({ reference })
    return result.snapshot.data ?? null
  },

  async setDoc<T>(reference: string, data: T, merge = true): Promise<void> {
    await FirebaseFirestore.setDocument({ reference, data, merge })
  },

  async updateDoc(reference: string, data: Record<string, any>): Promise<void> {
    await FirebaseFirestore.updateDocument({ reference, data })
  },

  async deleteDoc(reference: string): Promise<void> {
    await FirebaseFirestore.deleteDocument({ reference })
  },

  async deleteCollectionDocuments(reference: string): Promise<void> {
    try {
      const result: any = await (FirebaseFirestore as any).getCollection?.({
        reference
      })
      const documents: any[] =
        result?.documents || result?.snapshots || result?.documentsSnapshot || []
      for (const doc of documents) {
        const id = doc?.id || doc?.documentId || doc?.reference?.split('/')?.pop()
        if (!id) continue
        await FirebaseFirestore.deleteDocument({
          reference: `${reference}/${id}`
        })
      }
    } catch (error) {
      console.error(`Falha ao deletar documentos da colecao ${reference}`, error)
      throw error
    }
  },

  async deleteUserData(uid: string): Promise<void> {
    try {
      const base = `users/${uid}`
      await Promise.all([
        firestoreService.deleteCollectionDocuments(`${base}/clients`),
        firestoreService.deleteCollectionDocuments(`${base}/sales`),
        firestoreService.deleteCollectionDocuments(`${base}/payments`),
        firestoreService.deleteCollectionDocuments(`${base}/settings`),
        firestoreService.deleteCollectionDocuments(`${base}/meta`)
      ])

      await firestoreService.deleteDoc(`${base}/settings/price`).catch(() => {})
      await firestoreService.deleteDoc(`${base}/meta/profile`).catch(() => {})
    } catch (error) {
      console.error('Falha ao deletar dados do usuario', error)
      throw error
    }
  },

  listenToClients: (callback) => {
    let cancelled = false

    const reference = clientPath()

    const callbackIdPromise = FirebaseFirestore.addCollectionSnapshotListener(
      { reference },
      (event, error) => {
        if (cancelled) return
        if (error || !event) {
          console.error('listenToClients falhou', error)
          return
        }
        const clients = event.snapshots.map((s) => {
          const data = s.data ?? {}
          const client = {
            ...data,
            id: s.id
          }
          void backfillMeta(reference, s.id, data, backfilledClients)
          return client
        })
        callback(clients as Client[])
        noteSync()
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

  async getClientById(clientId: string): Promise<Client | null> {
    return firestoreService.getDoc<Client>(`${clientPath()}/${clientId}`)
  },

  saveClient: async (client: Client) => {
    const uid = requireUid()
    const { id, ...clientDataRaw } = client

    const meta = client.createdAt
      ? getMetaForUpdate(uid)
      : getMetaForCreate(uid)

    const clientData = { ...stripUndefined(clientDataRaw), ...meta }
    const reference = clientPath()

    await FirebaseFirestore.setDocument({
      reference: `${reference}/${id}`,
      data: clientData,
      merge: true
    })
  },

  deleteClient: async (clientId: string) => {
    const reference = clientPath()
    await FirebaseFirestore.deleteDocument({
      reference: `${reference}/${clientId}`
    })
  },

  listenToSales: (callback: (sales: Sale[]) => void) => {
    let callbackId: string | null = null
    let cancelled = false

    const reference = salesPath()

    ;(async () => {
      callbackId = await FirebaseFirestore.addCollectionSnapshotListener<
        Omit<Sale, 'id'>
      >({ reference }, (event, error) => {
        if (cancelled) return
        if (error || !event) {
          console.error('listenToSales falhou', error)
          return
        }
        const sales = event.snapshots.map((s) => {
          const data = s.data ?? {}
          const sale = { ...(data as any), id: s.id } as Sale
          void backfillMeta(reference, s.id, data, backfilledSales)
          return sale
        })
        callback(sales)
        noteSync()
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
    const uid = requireUid()
    const { id, ...saleData } = sale
    const reference = salesPath()
    const meta = sale.createdAt ? getMetaForUpdate(uid) : getMetaForCreate(uid)
    await FirebaseFirestore.setDocument({
      reference: `${reference}/${id}`,
      data: { ...saleData, ...meta },
      merge: true
    })
  },

  deleteSale: async (saleId: string) => {
    const reference = salesPath()
    await FirebaseFirestore.deleteDocument({
      reference: `${reference}/${saleId}`
    })
  },

  listenToPayments: (callback: (payments: Payment[]) => void) => {
    let callbackId: string | null = null
    let cancelled = false

    const reference = paymentsPath()

    ;(async () => {
      callbackId = await FirebaseFirestore.addCollectionSnapshotListener<
        Omit<Payment, 'id'>
      >({ reference }, (event, error) => {
        if (cancelled) return
        if (error || !event) {
          console.error('listenToPayments falhou', error)
          return
        }
        const payments = event.snapshots.map((s) => {
          const data = s.data ?? {}
          const payment = { ...(data as any), id: s.id } as Payment
          void backfillMeta(reference, s.id, data, backfilledPayments)
          return payment
        })
        callback(payments)
        noteSync()
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
    const uid = requireUid()
    const { id: paymentId, ...paymentData } = payment

    const metaPayment = payment.createdAt
      ? getMetaForUpdate(uid)
      : getMetaForCreate(uid)
    const metaUpdate = getMetaForUpdate(uid)

    const operations = [
      {
        type: 'set' as const,
        reference: `${paymentsPath()}/${paymentId}`,
        data: { ...paymentData, ...metaPayment }
      },
      ...salesToMarkAsPaid.map((sale) => ({
        type: 'update' as const,
        reference: `${salesPath()}/${sale.id}`,
        data: { isPaid: true, ...metaUpdate }
      }))
    ]

    await FirebaseFirestore.writeBatch({ operations })
  },

  deletePayment: async (paymentId: string) => {
    const reference = paymentsPath()
    await FirebaseFirestore.deleteDocument({
      reference: `${reference}/${paymentId}`
    })
  },

  // --- Reprodução (Vacas / Partos) ---
  listenToCows: (callback: (cows: Cow[]) => void) => {
    let cancelled = false
    const reference = cowsPath()

    const callbackIdPromise = FirebaseFirestore.addCollectionSnapshotListener(
      { reference },
      (event, error) => {
        if (cancelled) return
        if (error || !event) {
          console.error('listenToCows falhou', error)
          return
        }
        const cows = event.snapshots.map((s) => {
          const data = s.data ?? {}
          void backfillMeta(reference, s.id, data, backfilledCows)
          return { ...data, id: s.id }
        })
        callback(cows as Cow[])
        noteSync()
      }
    )

    return async () => {
      cancelled = true
      try {
        const callbackId = await callbackIdPromise
        await FirebaseFirestore.removeSnapshotListener({ callbackId })
      } catch (e) {
        console.error('Falha ao remover listener de cows', e)
      }
    }
  },

  async getCowById(cowId: string): Promise<Cow | null> {
    return firestoreService.getDoc<Cow>(`${cowsPath()}/${cowId}`)
  },

  saveCow: async (cow: Cow) => {
    const uid = requireUid()
    const { id, ...cowDataRaw } = cow

    const meta = cow.createdAt ? getMetaForUpdate(uid) : getMetaForCreate(uid)
    const cowData = { ...stripUndefined(cowDataRaw), ...meta }

    const reference = cowsPath()
    await FirebaseFirestore.setDocument({
      reference: `${reference}/${id}`,
      data: cowData,
      merge: true
    })
  },

  deleteCow: async (cowId: string) => {
    const reference = cowsPath()
    await FirebaseFirestore.deleteDocument({
      reference: `${reference}/${cowId}`
    })
  },

  listenToCalvings: (callback: (calvings: CalvingEvent[]) => void) => {
    let cancelled = false
    const reference = calvingsPath()

    const callbackIdPromise = FirebaseFirestore.addCollectionSnapshotListener(
      { reference },
      (event, error) => {
        if (cancelled) return
        if (error || !event) {
          console.error('listenToCalvings falhou', error)
          return
        }
        const calvings = event.snapshots.map((s) => {
          const data = s.data ?? {}
          void backfillMeta(reference, s.id, data, backfilledCalvings)
          return { ...data, id: s.id }
        })
        callback(calvings as CalvingEvent[])
        noteSync()
      }
    )

    return async () => {
      cancelled = true
      try {
        const callbackId = await callbackIdPromise
        await FirebaseFirestore.removeSnapshotListener({ callbackId })
      } catch (e) {
        console.error('Falha ao remover listener de calvings', e)
      }
    }
  },

  saveCalving: async (calving: CalvingEvent) => {
    const uid = requireUid()
    const { id, ...calvingDataRaw } = calving

    const meta = calving.createdAt ? getMetaForUpdate(uid) : getMetaForCreate(uid)
    const calvingData = { ...stripUndefined(calvingDataRaw), ...meta }

    const reference = calvingsPath()
    await FirebaseFirestore.setDocument({
      reference: `${reference}/${id}`,
      data: calvingData,
      merge: true
    })
  },

  deleteCalving: async (calvingId: string) => {
    const reference = calvingsPath()
    await FirebaseFirestore.deleteDocument({
      reference: `${reference}/${calvingId}`
    })
  },

  listenToPriceSettings: (
    callback: (settings: PriceSettings | null) => void
  ) => {
    let callbackId: string | null = null
    let cancelled = false

    const reference = `${settingsPath()}/price`

    ;(async () => {
      callbackId = await FirebaseFirestore.addDocumentSnapshotListener<
        PriceSettings
      >(
        { reference },
        (event, error) => {
          if (cancelled) return
          if (error || !event) {
            console.error('listenToPriceSettings falhou', error)
            callback(null)
            return
          }

          callback(event.snapshot.data ?? null)
          noteSync()
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

  getPriceSettings: async (): Promise<PriceSettings | null> => {
    const result = await FirebaseFirestore.getDocument<PriceSettings>({
      reference: `${settingsPath()}/price`
    })
    return result.snapshot.data ?? null
  },

  savePriceSettings: async (settings: PriceSettings) => {
    const uid = requireUid()
    await FirebaseFirestore.setDocument({
      reference: `${settingsPath()}/price`,
      data: { ...settings, ...getMetaForUpdate(uid) } as any,
      merge: true
    })
  }
}
