import React from 'react'

type SettingsSectionProps = {
  title: string
  children: React.ReactNode
  className?: string
}

export function SettingsSection({
  title,
  children,
  className = ''
}: SettingsSectionProps) {
  return (
    <section
      className={`bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-sm ${className}`}
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow)'
      }}
    >
      <div className='px-4 pt-3 pb-2 text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-500'>
        {title}
      </div>
      <div className='divide-y divide-slate-800/80'>{children}</div>
    </section>
  )
}
