import React from 'react'

export function PageBrandHeader({ userName = 'Perfil' }: { userName?: string | null }) {
  const initials = String(userName || 'Perfil')
    .trim()
    .split(/[\s._-]+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase()

  return (
    <div className='flex items-center justify-between py-1'>
      <div className='flex items-center gap-2'>
        <span
          className='h-6 w-6 rounded-md flex items-center justify-center text-[11px] font-bold text-white'
          style={{ background: 'var(--primary)' }}
          aria-hidden='true'
        >
          N
        </span>
        <span className='text-xs font-semibold' style={{ color: 'var(--primary)' }}>Notaí</span>
      </div>
      <span
        className='h-7 min-w-7 rounded-full px-1 flex items-center justify-center text-[9px] font-semibold'
        style={{ background: 'var(--accent-soft)', color: 'var(--primary)' }}
        aria-label={`Perfil de ${userName || 'usuário'}`}
        title={userName || 'Perfil'}
      >
        {initials}
      </span>
    </div>
  )
}
