import React from 'react'

export function Modal({
  open,
  title,
  onClose,
  children,
  actions,
  closeLabel = 'Fechar',
  closeAriaLabel = 'Fechar',
  closeOnBackdrop = false,
  fullScreen = false
}: {
  open: boolean
  title: React.ReactNode
  onClose: () => void
  children: React.ReactNode
  actions?: React.ReactNode
  closeLabel?: React.ReactNode
  closeAriaLabel?: string
  closeOnBackdrop?: boolean
  fullScreen?: boolean
}) {
  if (!open) return null
  return (
    <div
      data-theme='flat-lime'
      className={`fixed inset-0 z-50 flex items-center justify-center ${fullScreen ? 'p-0' : 'px-4 py-4'}`}
      style={{
        background: 'rgba(26, 39, 29, 0.42)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className={`w-full ${fullScreen ? 'h-[100dvh] max-w-none max-h-none overflow-y-auto rounded-none border-0 p-4 sm:p-6' : 'max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border p-6 shadow-xl'} space-y-4`}
        style={{
          background: fullScreen ? 'var(--bg)' : 'var(--surface)',
          borderColor: 'var(--border)',
          boxShadow: fullScreen ? 'none' : '0 24px 50px -34px var(--shadow)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`space-y-4 ${fullScreen ? 'mx-auto w-full max-w-2xl' : ''}`}>
          <div className='flex items-center justify-between gap-3'>
            <h2 className='text-lg font-semibold' style={{ color: 'var(--text)' }}>
              {title}
            </h2>
            <div className='flex items-center gap-2'>
              {actions}
              <button
                onClick={onClose}
                aria-label={closeAriaLabel}
                className='h-9 w-9 rounded-full flex items-center justify-center text-sm'
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--muted)'
                }}
              >
                {closeLabel}
              </button>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
