import React, { useEffect, useState } from 'react'
import {
  CloudOff,
  Clock3,
  Droplets,
  Info,
  Lock,
  Mail,
  Settings as SettingsIcon,
  Trash2,
  Wifi
} from 'lucide-react'
import type { PriceSettings } from '@/types'
import { authService } from '@/services/auth'
import { firestoreService } from '@/services/firestore'
import { EditPriceSheet } from '@/components/settings/EditPriceSheet'
import { PendingChangesPill } from '@/components/PendingChangesPill'
import { SyncStatusPill } from '@/components/SyncStatusPill'
import { usePendingQueue } from '@/hooks/usePendingQueue'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import '../../styles/theme-flat.css'

type SettingsPageProps = {
  priceSettings: PriceSettings
  onSavePriceSettings: (next: PriceSettings) => void | Promise<void>
  versionLabel?: string
  currentUserEmail?: string
  currentUserId?: string
  onSignOut?: () => void | Promise<void>
  onOpenPendingModal?: () => void
  currentUserIsAnonymous?: boolean
}

export function SettingsPage({
  priceSettings,
  onSavePriceSettings,
  versionLabel = 'Nottai',
  currentUserEmail,
  currentUserId,
  onSignOut,
  onOpenPendingModal,
  currentUserIsAnonymous
}: SettingsPageProps) {
  const [currentPrice, setCurrentPrice] = useState<number>(priceSettings.standard ?? 0)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPriceSheet, setShowPriceSheet] = useState(false)
  const [priceSheetType, setPriceSheetType] = useState<'standard' | 'custom'>('standard')

  useEffect(() => {
    setCurrentPrice(priceSettings.standard ?? 0)
  }, [priceSettings])

  const { isOnline, lastSyncAt } = useSyncStatus()
  const { pendingCount, failedCount } = usePendingQueue()

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`

  const formatSyncAgo = (ts: number | null) => {
    if (!ts) return 'Aguardando primeira sincroniza\u00e7\u00e3o'
    const diffMinutes = Math.max(
      0,
      Math.floor((Date.now() - Number(ts)) / 1000 / 60)
    )
    if (diffMinutes === 0) return 'Sincronizado agora'
    if (diffMinutes === 1) return 'Sincronizado h\u00e1 1 min'
    if (diffMinutes < 60) return `Sincronizado h\u00e1 ${diffMinutes} min`
    const hours = Math.floor(diffMinutes / 60)
    return `Sincronizado h\u00e1 ${hours}h`
  }

  const handleSavePrice = async (type: 'standard' | 'custom', nextValue: number) => {
    const nextSettings: PriceSettings = {
      standard: type === 'standard' ? nextValue : (priceSettings.standard ?? 0),
      custom: type === 'custom' ? nextValue : (priceSettings.custom ?? 0)
    }
    try {
      await onSavePriceSettings(nextSettings)
      if (type === 'standard') setCurrentPrice(nextValue)
    } catch (error) {
      console.error('Falha ao salvar pre\u00e7os', error)
      throw error
    }
  }

  const translateError = (error: any) => {
    const code = (error?.code || error?.message || '').toString()
    if (code.includes('invalid-credential') || code.includes('invalid-login')) {
      return 'Credenciais inv\u00e1lidas. Verifique e-mail e senha.'
    }
    if (code.includes('email-already-in-use')) return 'E-mail j\u00e1 est\u00e1 em uso.'
    if (code.includes('invalid-email')) return 'E-mail inv\u00e1lido.'
    if (code.includes('weak-password')) return 'Senha muito fraca (m\u00ednimo 6).'
    if (code.includes('network')) return 'Sem internet. Tente novamente.'
    if (code.includes('requires-recent-login')) {
      return 'Reautentica\u00e7\u00e3o necess\u00e1ria. Informe sua senha atual.'
    }
    return 'N\u00e3o foi poss\u00edvel concluir a a\u00e7\u00e3o. Tente novamente.'
  }

  const Modal = ({
    open,
    title,
    children,
    onClose
  }: {
    open: boolean
    title: string
    children: React.ReactNode
    onClose: () => void
  }) =>
    !open ? null : (
      <div className='fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center px-4 z-50'>
        <div className='w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4'>
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

  const EmailModal = () => {
    const [newEmail, setNewEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loadingEmail, setLoadingEmail] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const handleUpdateEmail = async (reauth = false) => {
      const trimmedEmail = newEmail.trim()
      if (!trimmedEmail) {
        setError('Informe um e-mail v\u00e1lido.')
        return
      }
      setError(null)
      setSuccess(null)
      try {
        setLoadingEmail(true)
        if (reauth) {
          if (!currentUserEmail) throw new Error('requires-recent-login')
          if (!password) {
            setError('Informe sua senha atual para confirmar.')
            return
          }
          await authService.reauthWithPassword(currentUserEmail, password)
        }
        await authService.updateEmail(trimmedEmail)
        setSuccess('E-mail atualizado com sucesso.')
      } catch (err) {
        const code = (err as any)?.code || (err as any)?.message || ''
        if (!reauth && code.toString().includes('requires-recent-login')) {
          await handleUpdateEmail(true)
          return
        }
        setError(translateError(err))
      } finally {
        setLoadingEmail(false)
      }
    }

    return (
      <Modal
        open={showEmailModal}
        title='Alterar e-mail'
        onClose={() => setShowEmailModal(false)}
      >
        {error && (
          <div className='p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-sm'>
            {error}
          </div>
        )}
        {success && (
          <div className='p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-100 text-sm'>
            {success}
          </div>
        )}
        <div className='space-y-3'>
          <div className='space-y-1'>
            <label className='text-sm text-slate-300'>Novo e-mail</label>
            <input
              type='email'
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className='w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
              placeholder='novo@email.com'
              disabled={loadingEmail}
            />
          </div>
          <div className='space-y-1'>
            <label className='text-sm text-slate-300'>
              Senha atual (pode ser solicitada)
            </label>
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
              placeholder='Sua senha'
              disabled={loadingEmail}
            />
          </div>
          <button
            onClick={() => handleUpdateEmail()}
            disabled={loadingEmail}
            className='w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg font-semibold transition-all active:scale-[0.99]'
          >
            {loadingEmail ? 'Salvando...' : 'Salvar novo e-mail'}
          </button>
        </div>
      </Modal>
    )
  }

  const PasswordModal = () => {
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const handleUpdatePassword = async (reauth = false) => {
      setError(null)
      setSuccess(null)
      if (newPassword.length < 6) {
        setError('Nova senha deve ter pelo menos 6 caracteres.')
        return
      }
      if (newPassword !== confirmPassword) {
        setError('As senhas n\u00e3o conferem.')
        return
      }
      try {
        setLoading(true)
        if (reauth) {
          if (!currentUserEmail) throw new Error('requires-recent-login')
          if (!currentPassword) {
            setError('Informe sua senha atual para confirmar.')
            return
          }
          await authService.reauthWithPassword(currentUserEmail, currentPassword)
        }
        await authService.updatePassword(newPassword)
        setSuccess('Senha atualizada com sucesso.')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } catch (err) {
        const code = (err as any)?.code || (err as any)?.message || ''
        if (!reauth && code.toString().includes('requires-recent-login')) {
          await handleUpdatePassword(true)
          return
        }
        setError(translateError(err))
      } finally {
        setLoading(false)
      }
    }

    return (
      <Modal
        open={showPasswordModal}
        title='Alterar senha'
        onClose={() => setShowPasswordModal(false)}
      >
        {error && (
          <div className='p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-sm'>
            {error}
          </div>
        )}
        {success && (
          <div className='p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-100 text-sm'>
            {success}
          </div>
        )}
        <div className='space-y-3'>
          <div className='space-y-1'>
            <label className='text-sm text-slate-300'>Senha atual</label>
            <input
              type='password'
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className='w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
              placeholder='Senha atual'
              disabled={loading}
            />
          </div>
          <div className='space-y-1'>
            <label className='text-sm text-slate-300'>Nova senha</label>
            <input
              type='password'
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className='w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
              placeholder='Nova senha'
              disabled={loading}
            />
          </div>
          <div className='space-y-1'>
            <label className='text-sm text-slate-300'>Confirmar nova senha</label>
            <input
              type='password'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className='w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
              placeholder='Repita a senha'
              disabled={loading}
            />
          </div>
          <button
            onClick={() => handleUpdatePassword()}
            disabled={loading}
            className='w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg font-semibold transition-all active:scale-[0.99]'
          >
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </div>
      </Modal>
    )
  }

  const DeleteModal = () => {
    const [confirmText, setConfirmText] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleDelete = async (reauth = false) => {
      setError(null)
      if (confirmText !== 'EXCLUIR') {
        setError('Digite EXCLUIR para confirmar.')
        return
      }
      if (!currentUserId) {
        setError('Usu\u00e1rio inv\u00e1lido para exclus\u00e3o.')
        return
      }
      try {
        setLoading(true)
        if (reauth) {
          if (!currentUserEmail) throw new Error('requires-recent-login')
          if (!password) {
            setError('Informe sua senha atual para confirmar.')
            return
          }
          await authService.reauthWithPassword(currentUserEmail, password)
        }

        await firestoreService.deleteUserData(currentUserId)
        await authService.deleteUser()
      } catch (err) {
        const code = (err as any)?.code || (err as any)?.message || ''
        if (!reauth && code.toString().includes('requires-recent-login')) {
          await handleDelete(true)
          return
        }
        setError(translateError(err))
      } finally {
        setLoading(false)
      }
    }

    return (
      <Modal
        open={showDeleteModal}
        title='Excluir conta'
        onClose={() => setShowDeleteModal(false)}
      >
        {error && (
          <div className='p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-sm'>
            {error}
          </div>
        )}
        <div className='space-y-3'>
          <p className='text-sm text-slate-300'>
            Isso apaga sua conta e seus dados deste dispositivo.
          </p>
          <div className='space-y-1'>
            <label className='text-sm text-slate-300'>Digite EXCLUIR</label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className='w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500'
              placeholder='EXCLUIR'
              disabled={loading}
            />
          </div>
          <div className='space-y-1'>
            <label className='text-sm text-slate-300'>Senha atual (pode ser solicitada)</label>
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500'
              placeholder='Senha'
              disabled={loading}
            />
          </div>
          <button
            onClick={() => handleDelete()}
            disabled={loading || confirmText !== 'EXCLUIR'}
            className='w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg font-semibold transition-all active:scale-[0.99]'
          >
            {loading ? 'Excluindo...' : 'Excluir permanentemente'}
          </button>
        </div>
      </Modal>
    )
  }

  const bullet = '\u2022'
  const passwordMask = bullet.repeat(8)
  const syncStatusLine = isOnline
    ? `Online ${bullet} sincronizando automaticamente`
    : `Offline ${bullet} suas altera\u00e7\u00f5es ser\u00e3o sincronizadas quando voltar a internet.`
  const offlineLabel =
    failedCount > 0
      ? `Pend\u00eancias offline: ${pendingCount} (${failedCount} falharam)`
      : `Pend\u00eancias offline: ${pendingCount}`
  const accountLabel = currentUserIsAnonymous
    ? 'Convidado (Teste)'
    : currentUserEmail || 'Sem e-mail'
  const standardPriceLabel = formatCurrency(currentPrice)
  const customPriceLabel = formatCurrency(priceSettings.custom ?? 0)

  return (
    <div
      data-theme='flat-lime'
      className='min-h-screen animate-fade-in'
      style={{
        background: 'var(--bg)',
        color: 'var(--text)',
        paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))',
        paddingLeft: 16,
        paddingRight: 16
      }}
    >
      <div className='flex items-center gap-4 mb-6'>
        <div
          className='h-12 w-12 rounded-2xl flex items-center justify-center'
          style={{
            background: 'rgba(184, 255, 44, 0.14)',
            border: '1px solid rgba(184, 255, 44, 0.4)',
            color: 'var(--accent)'
          }}
        >
          <SettingsIcon size={20} />
        </div>
        <div>
          <h1 className='text-[24px] font-semibold leading-none'>
            {'Configura\u00e7\u00f5es'}
          </h1>
          <p className='mt-1 text-xs' style={{ color: 'var(--muted)' }}>
            Personalize seu app
          </p>
        </div>
      </div>

      <div className='space-y-6'>
        <div>
          <p
            className='text-[11px] font-semibold uppercase tracking-[0.2em] mb-2'
            style={{ color: 'var(--accent)' }}
          >
            {'PRE\u00c7OS'}
          </p>
          <div className='flat-card overflow-hidden'>
            <button
              type='button'
              onClick={() => {
                setPriceSheetType('standard')
                setShowPriceSheet(true)
              }}
              className='w-full flex items-center justify-between gap-4 px-4 py-4 text-left transition-transform active:scale-[0.99]'
            >
              <div className='flex items-center gap-3 min-w-0'>
                <div
                  className='h-10 w-10 rounded-xl flex items-center justify-center'
                  style={{
                    background: 'rgba(184, 255, 44, 0.14)',
                    border: '1px solid rgba(184, 255, 44, 0.4)',
                    color: 'var(--accent)'
                  }}
                >
                  <Droplets size={18} />
                </div>
                <div className='min-w-0'>
                  <p className='text-sm font-semibold'>{'Pre\u00e7o Padr\u00e3o'}</p>
                  <p className='text-xs' style={{ color: 'var(--muted)' }}>
                    Usado em novas vendas
                  </p>
                </div>
              </div>
              <span
                className='px-3 py-1 rounded-full text-sm font-semibold tabular-nums'
                style={{
                  background: 'rgba(184, 255, 44, 0.18)',
                  border: '1px solid rgba(184, 255, 44, 0.5)',
                  color: 'var(--accent)'
                }}
              >
                {standardPriceLabel}
              </span>
            </button>
            <div className='h-px' style={{ background: 'rgba(255, 255, 255, 0.06)' }} />
            <button
              type='button'
              onClick={() => {
                setPriceSheetType('custom')
                setShowPriceSheet(true)
              }}
              className='w-full flex items-center justify-between gap-4 px-4 py-4 text-left transition-transform active:scale-[0.99]'
            >
              <div className='flex items-center gap-3 min-w-0'>
                <div
                  className='h-10 w-10 rounded-xl flex items-center justify-center'
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--muted)'
                  }}
                >
                  <Droplets size={18} />
                </div>
                <div className='min-w-0'>
                  <p className='text-sm font-semibold'>
                    {'Pre\u00e7o Personalizado'}
                  </p>
                  <p className='text-xs' style={{ color: 'var(--muted)' }}>
                    Clientes especiais
                  </p>
                </div>
              </div>
              <span
                className='px-3 py-1 rounded-full text-sm font-semibold tabular-nums'
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--muted)'
                }}
              >
                {customPriceLabel}
              </span>
            </button>
          </div>
          <div className='mt-3 flex items-start gap-2 text-xs' style={{ color: 'var(--muted)' }}>
            <Info size={14} className='mt-0.5' />
            <p>
              {
                'O pre\u00e7o padr\u00e3o \u00e9 usado automaticamente em novas vendas. O personalizado pode ser aplicado a clientes espec\u00edficos.'
              }
            </p>
          </div>
        </div>

        <div>
          <p
            className='text-[11px] font-semibold uppercase tracking-[0.2em] mb-2'
            style={{ color: 'var(--accent)' }}
          >
            {'SINCRONIZA\u00c7\u00c3O'}
          </p>
          <div className='flat-card overflow-hidden'>
            <div className='flex items-center justify-between gap-4 px-4 py-4'>
              <div className='flex items-center gap-3 min-w-0'>
                <div
                  className='h-10 w-10 rounded-xl flex items-center justify-center'
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--muted)'
                  }}
                >
                  <Wifi size={18} />
                </div>
                <div className='min-w-0'>
                  <p className='text-sm font-semibold'>Status</p>
                  <p className='text-xs' style={{ color: 'var(--muted)' }}>
                    {syncStatusLine}
                  </p>
                </div>
              </div>
              <SyncStatusPill />
            </div>
            <div className='h-px' style={{ background: 'rgba(255, 255, 255, 0.06)' }} />
            <div className='flex items-center justify-between gap-4 px-4 py-4'>
              <div className='flex items-center gap-3 min-w-0'>
                <div
                  className='h-10 w-10 rounded-xl flex items-center justify-center'
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--muted)'
                  }}
                >
                  <Clock3 size={18} />
                </div>
                <div className='min-w-0'>
                  <p className='text-sm font-semibold'>
                    {'\u00daltima sincroniza\u00e7\u00e3o'}
                  </p>
                  <p className='text-xs' style={{ color: 'var(--muted)' }}>
                    {lastSyncAt
                      ? 'Autom\u00e1tica'
                      : 'Aguardando primeira sincroniza\u00e7\u00e3o'}
                  </p>
                </div>
              </div>
              <span
                className='inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border'
                style={{
                  background: 'var(--surface-2)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
              >
                <span className='h-2 w-2 rounded-full bg-emerald-400' />
                {formatSyncAgo(lastSyncAt ?? null)}
              </span>
            </div>
            <div className='h-px' style={{ background: 'rgba(255, 255, 255, 0.06)' }} />
            <div className='flex items-center justify-between gap-4 px-4 py-4'>
              <div className='flex items-center gap-3 min-w-0'>
                <div
                  className='h-10 w-10 rounded-xl flex items-center justify-center'
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--muted)'
                  }}
                >
                  <CloudOff size={18} />
                </div>
                <div className='min-w-0'>
                  <p className='text-sm font-semibold'>{'Pend\u00eancias offline'}</p>
                  <p className='text-xs' style={{ color: 'var(--muted)' }}>
                    {offlineLabel}
                  </p>
                </div>
              </div>
              <PendingChangesPill onClick={() => onOpenPendingModal?.()} />
            </div>
          </div>
        </div>

        <div>
          <p
            className='text-[11px] font-semibold uppercase tracking-[0.2em] mb-2'
            style={{ color: 'var(--accent)' }}
          >
            {'CONTA & SEGURAN\u00c7A'}
          </p>
          <div className='flat-card overflow-hidden'>
            <div className='flex items-center justify-between gap-4 px-4 py-4'>
              <div className='flex items-center gap-3 min-w-0'>
                <div
                  className='h-10 w-10 rounded-xl flex items-center justify-center'
                  style={{
                    background: 'rgba(184, 255, 44, 0.14)',
                    border: '1px solid rgba(184, 255, 44, 0.4)',
                    color: 'var(--accent)'
                  }}
                >
                  <Mail size={18} />
                </div>
                <div className='min-w-0'>
                  <p className='text-sm font-semibold'>E-mail</p>
                  <p className='text-xs truncate' style={{ color: 'var(--muted)' }}>
                    {accountLabel}
                  </p>
                </div>
              </div>
              <button
                type='button'
                onClick={() => setShowEmailModal(true)}
                className='px-3 py-1.5 rounded-full text-xs font-semibold transition-transform active:scale-[0.98]'
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)'
                }}
              >
                Alterar
              </button>
            </div>
            <div className='h-px' style={{ background: 'rgba(255, 255, 255, 0.06)' }} />
            <div className='flex items-center justify-between gap-4 px-4 py-4'>
              <div className='flex items-center gap-3 min-w-0'>
                <div
                  className='h-10 w-10 rounded-xl flex items-center justify-center'
                  style={{
                    background: 'rgba(184, 255, 44, 0.14)',
                    border: '1px solid rgba(184, 255, 44, 0.4)',
                    color: 'var(--accent)'
                  }}
                >
                  <Lock size={18} />
                </div>
                <div className='min-w-0'>
                  <p className='text-sm font-semibold'>Senha</p>
                  <p className='text-xs' style={{ color: 'var(--muted)' }}>
                    {passwordMask}
                  </p>
                </div>
              </div>
              <button
                type='button'
                onClick={() => setShowPasswordModal(true)}
                className='px-3 py-1.5 rounded-full text-xs font-semibold transition-transform active:scale-[0.98]'
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)'
                }}
              >
                Alterar
              </button>
            </div>
            <div className='h-px' style={{ background: 'rgba(255, 255, 255, 0.06)' }} />
            <div className='flex items-center justify-between gap-4 px-4 py-4'>
              <div className='flex items-center gap-3 min-w-0'>
                <div
                  className='h-10 w-10 rounded-xl flex items-center justify-center'
                  style={{
                    background: 'rgba(255, 90, 106, 0.14)',
                    border: '1px solid rgba(255, 90, 106, 0.45)',
                    color: 'var(--danger)'
                  }}
                >
                  <Trash2 size={18} />
                </div>
                <div className='min-w-0'>
                  <p className='text-sm font-semibold text-rose-200'>Excluir conta</p>
                  <p className='text-xs' style={{ color: 'var(--muted)' }}>
                    Remove seus dados...
                  </p>
                </div>
              </div>
              <button
                type='button'
                onClick={() => setShowDeleteModal(true)}
                className='px-3 py-1.5 rounded-full text-xs font-semibold transition-transform active:scale-[0.98]'
                style={{
                  background: 'rgba(255, 90, 106, 0.95)',
                  border: '1px solid rgba(255, 90, 106, 0.55)',
                  color: '#fff'
                }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      </div>

      {onSignOut && (
        <div className='mt-6 flex justify-center'>
          <button
            onClick={async () => {
              if (!onSignOut) return
              try {
                setIsSigningOut(true)
                await onSignOut()
              } catch (error) {
                console.error('Falha ao sair', error)
                alert('N\u00e3o foi poss\u00edvel sair. Tente novamente.')
              } finally {
                setIsSigningOut(false)
              }
            }}
            disabled={isSigningOut}
            className='px-4 py-2 rounded-full text-xs font-semibold transition-transform active:scale-[0.98] disabled:opacity-60'
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--muted)'
            }}
          >
            {isSigningOut ? 'Saindo...' : 'Sair'}
          </button>
        </div>
      )}

      <div className='text-center p-4'>
        <p className='text-slate-600 text-xs'>{versionLabel}</p>
      </div>

      <EmailModal />
      <PasswordModal />
      <DeleteModal />
      <EditPriceSheet
        open={showPriceSheet}
        initialValue={
          priceSheetType === 'standard'
            ? priceSettings.standard ?? 0
            : priceSettings.custom ?? 0
        }
        onClose={() => setShowPriceSheet(false)}
        onSave={(value) => handleSavePrice(priceSheetType, value)}
        title={
          priceSheetType === 'standard'
            ? 'Pre\u00e7o padr\u00e3o (R$/L)'
            : 'Pre\u00e7o personalizado (R$/L)'
        }
      />
    </div>
  )
}
