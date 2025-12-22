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
    <div
      data-theme='flat-lime'
      className='fixed inset-0 z-50 flex items-center justify-center px-4'
      style={{
        background: 'rgba(11, 15, 20, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}
    >
      <div
        className='w-full max-w-lg rounded-2xl p-6 shadow-xl space-y-4 border'
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          boxShadow: '0 24px 50px -34px var(--shadow)'
        }}
      >
        <div className='flex items-center justify-between'>
          <h2 className='text-lg font-semibold' style={{ color: 'var(--text)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className='h-9 w-9 rounded-full flex items-center justify-center text-sm'
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--muted)'
            }}
          >
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
