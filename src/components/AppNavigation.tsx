import React from 'react'
import {
  Users,
  Wallet,
  BarChart3,
  Milk,
  Settings,
  Leaf,
} from 'lucide-react'
import type { TabState } from '../types'

const items: { id: TabState; label: string; icon: typeof Users }[] = [
  { id: 'CLIENTS', label: 'Clientes', icon: Users },
  { id: 'PAYMENTS', label: 'Pagamentos', icon: Wallet },
  { id: 'REPORTS', label: 'Relatórios', icon: BarChart3 },
  { id: 'REPRODUCTION', label: 'Reprodução', icon: Milk },
  { id: 'SETTINGS', label: 'Ajustes', icon: Settings },
]

export function AppNavigation({
  activeTab,
  onNavigate,
}: {
  activeTab: TabState
  onNavigate: (tab: TabState) => void
}) {
  return (
    <nav className="app-navigation" aria-label="Navegação principal">
      <a
        className="nav-brand"
        href="#clientes"
        onClick={(event) => {
          event.preventDefault()
          onNavigate('CLIENTS')
        }}
      >
        <span className="brand-symbol">
          <Leaf size={24} />
        </span>
        <span>
          Nottai<span className="brand-dot">.</span>
        </span>
      </a>
      <div className="nav-links">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            aria-current={activeTab === id ? 'page' : undefined}
          >
            <Icon size={21} strokeWidth={activeTab === id ? 2.2 : 1.7} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
