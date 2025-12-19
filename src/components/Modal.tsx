import React from 'react'

export function Modal({
  open,
  title,
  onClose,
  children
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className='fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center px-4'>
      <div className='w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4'>
        <div className='flex items-center justify-between'>
          <h2 className='text-lg font-semibold text-white'>{title}</h2>
          <button
            onClick={onClose}
            className='text-slate-400 hover:text-white text-sm'
          >
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
