import React from 'react'
import { usePendingQueue } from '@/hooks/usePendingQueue'

export function PendingChangesPill({ onClick }: { onClick: () => void }) {
  const { pendingCount, failedCount } = usePendingQueue()

  if (pendingCount === 0 && failedCount === 0) return null

  const label = failedCount > 0
    ? `${pendingCount} pendencias, ${failedCount} falharam`
    : `${pendingCount} pendencias`

  return (
    <button
      onClick={onClick}
      className='inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border bg-slate-800 text-slate-100 border-slate-700 hover:bg-slate-700'
    >
      <span className='h-2 w-2 rounded-full bg-amber-400' />
      {label}
    </button>
  )
}
