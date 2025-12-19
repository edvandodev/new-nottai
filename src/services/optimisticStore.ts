type QueueAction =
  | {
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
    }

type OptimisticEvent =
  | { type: 'APPLY'; action: QueueAction }
  | { type: 'CONFIRM'; key: string }
  | { type: 'FAIL'; key: string; error: string }

const pendingKeys = new Set<string>()
const subscribers = new Set<(event: OptimisticEvent) => void>()

const notify = (event: OptimisticEvent) => {
  subscribers.forEach((cb) => {
    try {
      cb(event)
    } catch (error) {
      console.error('optimisticStore subscriber error', error)
    }
  })
}

export const optimisticStore = {
  apply(action: QueueAction) {
    pendingKeys.add(action.key)
    notify({ type: 'APPLY', action })
  },

  confirm(key: string) {
    pendingKeys.delete(key)
    notify({ type: 'CONFIRM', key })
  },

  fail(key: string, error: string) {
    pendingKeys.add(key)
    notify({ type: 'FAIL', key, error })
  },

  isPending(key: string) {
    return pendingKeys.has(key)
  },

  subscribe(cb: (event: OptimisticEvent) => void) {
    subscribers.add(cb)
    return () => subscribers.delete(cb)
  }
}

export type { QueueAction, OptimisticEvent }
