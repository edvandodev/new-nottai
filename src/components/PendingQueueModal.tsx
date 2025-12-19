import React, { useMemo, useState } from 'react'
import { Modal } from './Modal'
import { usePendingQueue } from '@/hooks/usePendingQueue'

const formatDate = (ts: number) => {
  const d = new Date(ts)
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
}

const typeLabel: Record<string, string> = {
  UPSERT_CLIENT: 'Salvar cliente',
  DELETE_CLIENT: 'Excluir cliente',
  UPSERT_SALE: 'Salvar venda',
  DELETE_SALE: 'Excluir venda',
  UPSERT_PAYMENT: 'Salvar pagamento',
  DELETE_PAYMENT: 'Excluir pagamento',
  SAVE_PRICE_SETTINGS: 'Salvar precos'
}

export function PendingQueueModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, retry, discard, clearAll, processNow } = usePendingQueue()
  const [confirmClear, setConfirmClear] = useState('')

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.createdAt - b.createdAt),
    [items]
  )

  return (
    <Modal open={open} title='Pendencias offline' onClose={onClose}>
      <div className='space-y-3 max-h-[60vh] overflow-y-auto pr-1'>
        {sorted.length === 0 && (
          <p className='text-sm text-slate-400'>Nenhuma pendencia no momento.</p>
        )}
        {sorted.map((item) => (
          <div
            key={item.id}
            className='p-3 bg-slate-900/70 border border-slate-800 rounded-lg space-y-1'
          >
            <div className='flex items-center justify-between gap-2'>
              <span className='text-sm text-white font-semibold'>
                {typeLabel[item.type] || item.type}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${
                  item.status === 'PENDING'
                    ? 'bg-amber-500/10 text-amber-200 border-amber-400/40'
                    : item.status === 'SENDING'
                    ? 'bg-blue-500/10 text-blue-200 border-blue-400/40'
                    : 'bg-red-500/10 text-red-200 border-red-400/40'
                }`}
              >
                {item.status}
              </span>
            </div>
            <div className='text-xs text-slate-400'>Criado em {formatDate(item.createdAt)}</div>
            {item.attempts > 0 && (
              <div className='text-xs text-slate-400'>Tentativas: {item.attempts}</div>
            )}
            {item.lastError && (
              <div className='text-xs text-red-200'>Erro: {item.lastError}</div>
            )}
            <div className='flex gap-2 pt-2'>
              <button
                onClick={() => retry(item.id)}
                className='px-3 py-1 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500'
              >
                Tentar
              </button>
              <button
                onClick={() => discard(item.id)}
                className='px-3 py-1 rounded-md bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 hover:bg-slate-700'
              >
                Descartar
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className='mt-4 space-y-2'>
        <div className='flex gap-2'>
          <button
            onClick={() => processNow()}
            className='px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500'
          >
            Tentar agora
          </button>
          <button
            onClick={() => {
              if (confirmClear === 'LIMPAR') {
                clearAll()
                setConfirmClear('')
              }
            }}
            className='px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-400'
            disabled={confirmClear !== 'LIMPAR'}
          >
            Limpar tudo
          </button>
        </div>
        <input
          value={confirmClear}
          onChange={(e) => setConfirmClear(e.target.value)}
          placeholder='Digite LIMPAR para confirmar'
          className='w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500'
        />
      </div>
    </Modal>
  )
}
