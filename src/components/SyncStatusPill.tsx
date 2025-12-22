import React from 'react'
import { useSyncStatus } from '@/hooks/useSyncStatus'

const formatAgo = (ts: number) => {
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (diffSec < 10) return 'Sincronizado agora'
  const minutes = Math.floor(diffSec / 60)
  if (minutes < 1) return 'Sincronizado agora'
  if (minutes === 1) return 'Sincronizado h\u00e1 1 min'
  return `Sincronizado h\u00e1 ${minutes} min`
}

export function SyncStatusPill() {
  const { isOnline, lastSyncAt } = useSyncStatus()

  const label = !isOnline
    ? 'Offline'
    : lastSyncAt
    ? formatAgo(lastSyncAt)
    : 'Sincronizando...'

  const base = 'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border'
  const dotColor = !isOnline ? 'bg-rose-400' : 'bg-emerald-400'

  return (
    <span
      className={base}
      style={{
        background: 'var(--surface-2)',
        borderColor: 'var(--border)',
        color: 'var(--text)'
      }}
    >
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      {label}
    </span>
  )
}
