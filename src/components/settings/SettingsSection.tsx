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
      className={`flat-card rounded-2xl overflow-hidden shadow-sm ${className}`}
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow)'
      }}
    >
      <div className='px-4 pt-3 pb-2 text-[11px] uppercase tracking-[0.08em] font-semibold' style={{ color: 'var(--muted)' }}>
        {title}
      </div>
      <div className='settings-items'>{children}</div>
    </section>
  )
}
