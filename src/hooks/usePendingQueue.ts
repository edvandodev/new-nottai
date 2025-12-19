import { useEffect, useState, useCallback } from 'react'
import type { QueueItem } from '@/services/pendingQueue'
import { pendingQueue } from '@/services/pendingQueue'

export function usePendingQueue() {
  const [items, setItems] = useState<QueueItem[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)

  const refreshCounts = useCallback(async () => {
    const summary = await pendingQueue.getSummary()
    setPendingCount(summary.pending)
    setFailedCount(summary.failed)
  }, [])

  const refresh = useCallback(async () => {
    const all = await pendingQueue.getAll()
    setItems(all)
    await refreshCounts()
  }, [refreshCounts])

  useEffect(() => {
    refresh()
    const unsub = pendingQueue.subscribe((list) => {
      setItems(list)
      refreshCounts()
    })
    return unsub
  }, [refresh, refreshCounts])

  return {
    items,
    pendingCount,
    failedCount,
    refresh,
    processNow: () => pendingQueue.processNow(),
    retry: (id: string) => pendingQueue.retry(id),
    discard: (id: string) => pendingQueue.discard(id),
    clearAll: () => pendingQueue.clearAll()
  }
}
