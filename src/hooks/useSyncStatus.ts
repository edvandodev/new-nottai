import { useEffect, useState } from 'react'
import { firestoreService } from '@/services/firestore'

export function useSyncStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(
    firestoreService.getLastSyncAt()
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = firestoreService.onSync((ts) => setLastSyncAt(ts))
    return unsubscribe
  }, [])

  return { isOnline, lastSyncAt }
}
