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
  size = 'default'
}: {
  open: boolean
  title: React.ReactNode
  onClose: () => void
  children: React.ReactNode
  actions?: React.ReactNode
  closeLabel?: React.ReactNode
  closeAriaLabel?: string
  closeOnBackdrop?: boolean
  size?: 'default' | 'wide' | 'fullscreen'
}) {
  if (!open) return null
  return (
    <div
      data-theme='flat-lime'
      role='presentation'
      className={`fixed inset-0 z-50 flex ${size === 'fullscreen' ? 'items-stretch justify-stretch p-0' : 'items-center justify-center px-4'}`}
      style={{
        background: 'rgba(11, 15, 20, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <section
        role='dialog'
        aria-modal='true'
        aria-labelledby='app-modal-title'
        className={`w-full ${size === 'wide' ? 'max-w-2xl' : size === 'fullscreen' ? 'max-w-none h-[100dvh] flex flex-col overflow-hidden rounded-none p-0 border-0 space-y-0' : 'max-w-lg rounded-2xl p-6 border space-y-4'} shadow-xl`}
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          boxShadow: '0 24px 50px -34px var(--shadow)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between gap-3 ${size === 'fullscreen' ? 'px-5 pt-[max(16px,env(safe-area-inset-top))] pb-4 border-b' : ''}`} style={size === 'fullscreen' ? {borderColor:'var(--border)'} : undefined}>
          <h2 id='app-modal-title' className='text-lg font-semibold' style={{ color: 'var(--text)' }}>
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
      </section>
    </div>
  )
}
