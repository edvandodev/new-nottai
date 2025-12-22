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
  SAVE_PRICE_SETTINGS: 'Salvar pre\u00e7os'
}

export function PendingQueueModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, retry, discard, clearAll, processNow } = usePendingQueue()
  const [confirmClear, setConfirmClear] = useState('')

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.createdAt - b.createdAt),
    [items]
  )

  return (
    <Modal open={open} title='Pend\u00eancias offline' onClose={onClose}>
      <div className='space-y-3 max-h-[60vh] overflow-y-auto pr-1'>
        {sorted.length === 0 && (
          <p className='text-sm' style={{ color: 'var(--muted)' }}>
            {'Nenhuma pend\u00eancia no momento.'}
          </p>
        )}
        {sorted.map((item) => (
          <div
            key={item.id}
            className='p-3 rounded-lg space-y-1 border'
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border)'
            }}
          >
            <div className='flex items-center justify-between gap-2'>
              <span className='text-sm font-semibold' style={{ color: 'var(--text)' }}>
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
            <div className='text-xs' style={{ color: 'var(--muted)' }}>
              Criado em {formatDate(item.createdAt)}
            </div>
            {item.attempts > 0 && (
              <div className='text-xs' style={{ color: 'var(--muted)' }}>
                Tentativas: {item.attempts}
              </div>
            )}
            {item.lastError && (
              <div className='text-xs text-red-200'>Erro: {item.lastError}</div>
            )}
            <div className='flex gap-2 pt-2'>
              <button
                onClick={() => retry(item.id)}
                className='px-3 py-1 rounded-md text-xs font-semibold'
                style={{
                  background: 'var(--accent)',
                  color: 'var(--accent-ink)'
                }}
              >
                Tentar
              </button>
              <button
                onClick={() => discard(item.id)}
                className='px-3 py-1 rounded-md text-xs font-semibold border'
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
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
            className='px-4 py-2 rounded-lg text-sm font-semibold'
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-ink)'
            }}
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
            className='px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60'
            style={{
              background: 'var(--danger)',
              color: '#fff'
            }}
            disabled={confirmClear !== 'LIMPAR'}
          >
            Limpar tudo
          </button>
        </div>
        <input
          value={confirmClear}
          onChange={(e) => setConfirmClear(e.target.value)}
          placeholder='Digite LIMPAR para confirmar'
          className='w-full px-3 py-2 rounded-lg text-sm focus:outline-none'
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text)'
          }}
        />
      </div>
    </Modal>
  )
}
