import { Preferences } from '@capacitor/preferences'
import { firestoreService } from './firestore'
import { optimisticStore } from './optimisticStore'

export type QueueStatus = 'PENDING' | 'SENDING' | 'FAILED'

export type QueueItem = {
  id: string
  type:
    | 'UPSERT_CLIENT'
    | 'DELETE_CLIENT'
    | 'UPSERT_SALE'
    | 'DELETE_SALE'
    | 'UPSERT_PAYMENT'
    | 'DELETE_PAYMENT'
    | 'SAVE_PRICE_SETTINGS'
  key: string
  payload: any
  createdAt: number
  status: QueueStatus
  attempts: number
  lastError?: string
}

const STORAGE_KEY = 'nottai_pending_queue_v1'
let queueCache: QueueItem[] | null = null
const subscribers = new Set<(items: QueueItem[]) => void>()
let autoTimer: any = null

const genId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `q-${Math.random().toString(16).slice(2)}-${Date.now()}`
}

const notify = () => {
  if (!queueCache) return
  subscribers.forEach((cb) => {
    try {
      cb([...queueCache!])
    } catch (e) {
      console.error('pendingQueue subscriber error', e)
    }
  })
}

const loadQueue = async (): Promise<QueueItem[]> => {
  if (queueCache) return queueCache
  const res = await Preferences.get({ key: STORAGE_KEY })
  if (!res.value) {
    queueCache = []
    return queueCache
  }
  try {
    queueCache = JSON.parse(res.value) as QueueItem[]
  } catch (e) {
    console.error('Erro ao ler fila pendente', e)
    queueCache = []
  }
  return queueCache
}

const saveQueue = async (q: QueueItem[]) => {
  queueCache = q
  await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(q) })
  notify()
}

const compactQueue = (queue: QueueItem[], newItem: QueueItem): QueueItem[] => {
  const isUpsert = newItem.type.startsWith('UPSERT') || newItem.type === 'SAVE_PRICE_SETTINGS'
  const isDelete = newItem.type.startsWith('DELETE')

  if (newItem.type === 'SAVE_PRICE_SETTINGS') {
    return [...queue.filter((i) => i.type !== 'SAVE_PRICE_SETTINGS'), newItem]
  }

  if (isUpsert) {
    return [
      ...queue.filter(
        (i) => !(i.status !== 'SENDING' && i.type === newItem.type && i.key === newItem.key)
      ),
      newItem
    ]
  }

  if (isDelete) {
    return [
      ...queue.filter((i) => !(i.status !== 'SENDING' && i.key === newItem.key)),
      newItem
    ]
  }

  return [...queue, newItem]
}

const execAction = async (item: QueueItem) => {
  switch (item.type) {
    case 'UPSERT_CLIENT':
      return firestoreService.saveClient(item.payload)
    case 'DELETE_CLIENT':
      return firestoreService.deleteClient(item.payload)
    case 'UPSERT_SALE':
      return firestoreService.saveSale(item.payload)
    case 'DELETE_SALE':
      return firestoreService.deleteSale(item.payload)
    case 'UPSERT_PAYMENT':
      return firestoreService.savePayment(item.payload.payment, item.payload.salesToMarkAsPaid)
    case 'DELETE_PAYMENT':
      return firestoreService.deletePayment(item.payload)
    case 'SAVE_PRICE_SETTINGS':
      return firestoreService.savePriceSettings(item.payload)
    default:
      throw new Error('Tipo de acao desconhecido')
  }
}

export const pendingQueue = {
  subscribe(cb: (items: QueueItem[]) => void) {
    subscribers.add(cb)
    if (queueCache) cb([...queueCache])
    return () => subscribers.delete(cb)
  },

  async getAll(): Promise<QueueItem[]> {
    const q = await loadQueue()
    return [...q]
  },

  async getSummary(): Promise<{ pending: number; failed: number }> {
    const q = await loadQueue()
    return {
      pending: q.filter((i) => i.status === 'PENDING').length,
      failed: q.filter((i) => i.status === 'FAILED').length
    }
  },

  async enqueue(
    item: Omit<QueueItem, 'id' | 'createdAt' | 'status' | 'attempts'>
  ): Promise<void> {
    const q = await loadQueue()
    const newItem: QueueItem = {
      ...item,
      id: genId(),
      createdAt: Date.now(),
      status: 'PENDING',
      attempts: 0
    }
    const compacted = compactQueue(q.filter((i) => i.status !== 'SENDING'), newItem)
    await saveQueue(compacted)
  },

  async processNow(): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      notify()
      return
    }
    let q = await loadQueue()
    for (const item of [...q].sort((a, b) => a.createdAt - b.createdAt)) {
      if (item.status === 'SENDING') continue
      item.status = 'SENDING'
      item.attempts += 1
      await saveQueue(q)
      try {
        await execAction(item)
        q = (await loadQueue()).filter((i) => i.id !== item.id)
        await saveQueue(q)
        optimisticStore.confirm(item.key)
      } catch (error: any) {
        const message = (error?.message || error?.code || 'Erro').toString()
        q = await loadQueue()
        const idx = q.findIndex((i) => i.id === item.id)
        if (idx >= 0) {
          q[idx] = { ...q[idx], status: 'FAILED', lastError: message }
          await saveQueue(q)
        }
        optimisticStore.fail(item.key, message)
      }
    }
  },

  async retry(id: string): Promise<void> {
    const q = await loadQueue()
    const idx = q.findIndex((i) => i.id === id)
    if (idx >= 0) {
      q[idx] = { ...q[idx], status: 'PENDING', lastError: undefined }
      await saveQueue(q)
      await pendingQueue.processNow()
    }
  },

  async discard(id: string): Promise<void> {
    const q = await loadQueue()
    await saveQueue(q.filter((i) => i.id !== id))
  },

  async clearAll(): Promise<void> {
    await saveQueue([])
  },

  startAutoProcessor() {
    const onOnline = () => pendingQueue.processNow().catch(() => {})
    window.addEventListener('online', onOnline)
    if (autoTimer) clearInterval(autoTimer)
    autoTimer = setInterval(() => {
      if (typeof navigator === 'undefined' || navigator.onLine === false) return
      pendingQueue.processNow().catch(() => {})
    }, 15000)

    const cleanup = () => {
      window.removeEventListener('online', onOnline)
      if (autoTimer) clearInterval(autoTimer)
    }

    return cleanup
  }
}
