import React from 'react'
import {
  BarChart3, ChevronRight, LayoutDashboard, Milk, Plus, Settings, Users, Wallet
} from 'lucide-react'
import cowIcon from '../../assets/icon/icon-vaca.svg'
import type { TabState } from '@/types'

const navigation = [
  { tab: 'DASHBOARD', label: 'Visão geral', mobile: 'Início', icon: LayoutDashboard },
  { tab: 'CLIENTS', label: 'Clientes', mobile: 'Clientes', icon: Users },
  { tab: 'PAYMENTS', label: 'Pagamentos', mobile: 'Pagamentos', icon: Wallet },
  { tab: 'REPORTS', label: 'Relatórios', mobile: 'Relatórios', icon: BarChart3 },
  { tab: 'REPRODUCTION', label: 'Reprodução', mobile: 'Reprod.', icon: null },
  { tab: 'SETTINGS', label: 'Ajustes', mobile: 'Ajustes', icon: Settings }
] as const

type Props = {
  tab: TabState
  onNavigate: (tab: TabState) => void
  onNewSale: () => void
  status?: React.ReactNode
  banner?: React.ReactNode
  children: React.ReactNode
}

export function WorkspaceShell({ tab, onNavigate, onNewSale, status, banner, children }: Props) {
  const activeItem = navigation.find((item) => item.tab === tab)!

  const renderNavigationItem = ({ tab: target, label, mobile, icon: Icon }: typeof navigation[number]) => (
    <button
      key={target}
      type='button'
      aria-label={label}
      aria-current={tab === target ? 'page' : undefined}
      onClick={() => onNavigate(target)}
    >
      <span className='workspace-nav-icon' aria-hidden='true'>
        {Icon ? <Icon size={19} strokeWidth={1.8} /> : <img src={cowIcon} alt='' width={19} height={19} />}
      </span>
      <span className='workspace-mobile-label'>{mobile}</span>
      <span className='workspace-desktop-label'>{label}</span>
    </button>
  )

  return (
    <div className='workspace'>
      <a className='workspace-skip' href='#conteudo-principal'>Ir para o conteúdo</a>
      <nav className='workspace-navigation' aria-label='Navegação principal'>
        <div className='workspace-brand' translate='no'>
          <span className='workspace-brand-mark'><Milk size={21} aria-hidden='true' /></span>
          <div><strong>Nottaí</strong><span>Gestão do leite</span></div>
        </div>
        <p className='workspace-nav-label'>Gestão</p>
        <div className='workspace-nav-group'>
          {navigation.slice(0, 4).map(renderNavigationItem)}
        </div>
        <p className='workspace-nav-label'>Fazenda</p>
        <div className='workspace-nav-group'>{renderNavigationItem(navigation[4])}</div>
        <div className='workspace-nav-bottom'>
          {renderNavigationItem(navigation[5])}
          {status && <div className='workspace-sync'>{status}</div>}
        </div>
      </nav>
      <div className='workspace-body'>
        <header className='workspace-topbar'>
          <div className='workspace-topbar-inner'>
            <div className='workspace-breadcrumb'>
              <span className='workspace-brand-mark'><Milk size={19} aria-hidden='true' /></span>
              <span className='workspace-desktop-label'>Nottaí</span>
              <span className='workspace-mobile-label' translate='no'>Nottaí</span>
              <ChevronRight className='workspace-desktop-label' size={14} aria-hidden='true' />
              <strong className='workspace-desktop-label'>{activeItem.label}</strong>
            </div>
            <div className='workspace-topbar-actions'>
              {tab === 'DASHBOARD' && (
                <button className='agro-primary-button workspace-new-sale' type='button' onClick={onNewSale}>
                  <Plus size={17} aria-hidden='true' /> Nova venda
                </button>
              )}
              <button
                className='workspace-mobile-settings agro-icon-button'
                type='button'
                aria-label='Ajustes'
                aria-current={tab === 'SETTINGS' ? 'page' : undefined}
                onClick={() => onNavigate('SETTINGS')}
              >
                <Settings size={19} aria-hidden='true' />
              </button>
            </div>
          </div>
        </header>
        <div className='workspace-content'>
          {banner}
          <main id='conteudo-principal' tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
