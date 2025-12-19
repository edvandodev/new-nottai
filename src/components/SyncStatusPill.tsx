import React from 'react'
import { useSyncStatus } from '@/hooks/useSyncStatus'

const formatAgo = (ts: number) => {
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (diffSec < 10) return 'Sincronizado agora'
  const minutes = Math.floor(diffSec / 60)
  if (minutes < 1) return 'Sincronizado agora'
  if (minutes === 1) return 'Sincronizado h? 1 min'
  return `Sincronizado h? ${minutes} min`
}

export function SyncStatusPill() {
  const { isOnline, lastSyncAt } = useSyncStatus()

  const label = !isOnline
    ? 'Offline'
    : lastSyncAt
    ? formatAgo(lastSyncAt)
    : 'Sincronizando...'

  const base = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border'
  const classes = !isOnline
    ? 'bg-red-500/10 text-red-200 border-red-500/40'
    : 'bg-emerald-500/10 text-emerald-200 border-emerald-500/40'

  return <span className={`${base} ${classes}`}>{label}</span>
}
