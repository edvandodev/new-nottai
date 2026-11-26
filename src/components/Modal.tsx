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
  variant = 'default'
}: {
  open: boolean
  title: React.ReactNode
  onClose: () => void
  children: React.ReactNode
  actions?: React.ReactNode
  closeLabel?: React.ReactNode
  closeAriaLabel?: string
  closeOnBackdrop?: boolean
  variant?: 'default' | 'profile' | 'gallery'
}) {
  const titleId = React.useId()
  if (!open) return null
  return (
    <div
      data-theme='flat-lime'
      className={`agro-modal-backdrop agro-modal-${variant} fixed inset-0 z-50 flex items-center justify-center`}
      style={{
        background: 'rgba(11, 15, 20, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className='agro-modal-panel w-full border shadow-xl'
        role='dialog'
        aria-labelledby={titleId}
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          boxShadow: '0 24px 50px -34px var(--shadow)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='agro-modal-header flex items-center justify-between gap-3'>
          <h2 id={titleId} className='text-lg font-bold' style={{ color: 'var(--text)' }}>
            {title}
          </h2>
          <div className='flex items-center gap-2'>
            {actions}
            <button
              type='button'
              onClick={onClose}
              aria-label={closeAriaLabel}
              className='agro-modal-close flex items-center justify-center rounded-full px-3 text-sm'
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
        <div className='agro-modal-body'>{children}</div>
      </div>
    </div>
  )
}
