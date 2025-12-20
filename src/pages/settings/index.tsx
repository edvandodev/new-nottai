import React, { useEffect, useState } from 'react'
import { ChevronLeft, CloudOff, Clock3, Lock, Mail, ShieldOff, Wifi } from 'lucide-react'
import type { PriceSettings } from '@/types'
import { authService } from '@/services/auth'
import { firestoreService } from '@/services/firestore'
import { SyncStatusPill } from '@/components/SyncStatusPill'
import { PendingChangesPill } from '@/components/PendingChangesPill'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { usePendingQueue } from '@/hooks/usePendingQueue'
import { SettingsSection } from '@/components/settings/SettingsSection'
import { SettingsItem } from '@/components/settings/SettingsItem'
import { PriceHeroCard } from '@/components/settings/PriceHeroCard'
import { EditPriceSheet } from '@/components/settings/EditPriceSheet'
import { useTheme, themeDefinitions } from '@/context/ThemeContext'

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
  const [showThemeSheet, setShowThemeSheet] = useState(false)

  const { themeId, setThemeId, themes } = useTheme()

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
    if (!ts) return 'Aguardando primeira sincronizacao'
    const diffMinutes = Math.max(
      0,
      Math.floor((Date.now() - Number(ts)) / 1000 / 60)
    )
    if (diffMinutes === 0) return 'Sincronizado agora'
    if (diffMinutes === 1) return 'Sincronizado ha 1 min'
    if (diffMinutes < 60) return `Sincronizado ha ${diffMinutes} min`
    const hours = Math.floor(diffMinutes / 60)
    return `Sincronizado ha ${hours}h`
  }

  const handleSavePrice = async (nextValue: number) => {
    const nextSettings: PriceSettings = {
      standard: nextValue,
      custom: priceSettings.custom ?? 0
    }
    try {
      await onSavePriceSettings(nextSettings)
      setCurrentPrice(nextValue)
    } catch (error) {
      console.error('Falha ao salvar precos', error)
      throw error
    }
  }

  const translateError = (error: any) => {
    const code = (error?.code || error?.message || '').toString()
    if (code.includes('invalid-credential') || code.includes('invalid-login')) {
      return 'Credenciais invalidas. Verifique email e senha.'
    }
    if (code.includes('email-already-in-use')) return 'Email ja esta em uso.'
    if (code.includes('invalid-email')) return 'Email invalido.'
    if (code.includes('weak-password')) return 'Senha muito fraca (minimo 6).'
    if (code.includes('network')) return 'Sem internet. Tente novamente.'
    if (code.includes('requires-recent-login')) {
      return 'Reautenticacao necessaria. Informe sua senha atual.'
    }
    return 'Nao foi possivel concluir a acao. Tente novamente.'
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
        setError('Informe um email valido.')
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
        setSuccess('Email atualizado com sucesso.')
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
        setError('As senhas nao conferem.')
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
        setError('Usuario invalido para exclusao.')
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

  const userInitial = (currentUserEmail || '?').trim().charAt(0).toUpperCase() || '?'
  const bullet = '\u2022'
  const passwordMask = bullet.repeat(8)
  const syncStatusLine = isOnline
    ? `Online ${bullet} sincronizando automaticamente`
    : `Offline ${bullet} suas alteracoes serao sincronizadas quando voltar a internet.`
  const offlineLabel =
    failedCount > 0
      ? `Pendencias offline: ${pendingCount} (${failedCount} falharam)`
      : `Pendencias offline: ${pendingCount}`
  const accountLabel = currentUserIsAnonymous
    ? 'Convidado (Teste)'
    : currentUserEmail || 'Sem email'
  const enabledThemes = themes.filter((t) => t.enabled)
  const currentThemeName =
    themes.find((t) => t.id === themeId)?.name || 'Tema 01 (Atual)'

  return (
    <div
      className='space-y-5 animate-fade-in'
      style={{
        paddingBottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))'
      }}
    >
      <div className='flex items-center justify-between px-1'>
        <button
          type='button'
          onClick={() => {
            if (window.history.length > 1) window.history.back()
          }}
          className='h-10 w-10 rounded-full bg-slate-900/80 border border-slate-800 text-slate-200 flex items-center justify-center active:scale-[0.97] hover:border-slate-600'
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className='text-lg font-semibold text-white'>Ajustes</h1>
        <span className='w-10' />
      </div>

      {onSignOut && (
        <div className='bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4'>
          <div className='flex items-center gap-3 min-w-0'>
            <div className='h-12 w-12 rounded-full border border-blue-500/30 bg-blue-600/20 text-blue-100 font-bold flex items-center justify-center shadow-inner shadow-blue-900/30'>
              {userInitial}
            </div>
            <div className='min-w-0'>
              <p className='text-[11px] uppercase tracking-wide text-slate-500 font-semibold'>
                Conta
              </p>
              <p className='text-sm font-semibold text-white truncate'>
                {accountLabel}
              </p>
              {currentUserIsAnonymous && (
                <p className='text-[11px] text-slate-400'>Sessao temporaria</p>
              )}
            </div>
          </div>
          <button
            onClick={async () => {
              if (!onSignOut) return
              try {
                setIsSigningOut(true)
                await onSignOut()
              } catch (error) {
                console.error('Falha ao sair', error)
                alert('Nao foi possivel sair. Tente novamente.')
              } finally {
                setIsSigningOut(false)
              }
            }}
            disabled={isSigningOut}
            className='px-4 py-2 rounded-full border border-slate-700 bg-slate-800/60 hover:border-slate-500 hover:bg-slate-800 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60'
          >
            {isSigningOut ? 'Saindo...' : 'Sair'}
          </button>
        </div>
      )}

      <PriceHeroCard
        valueLabel={`${formatCurrency(currentPrice)} / L`}
        subtitle='Aplicado por padrao'
        onEdit={() => setShowPriceSheet(true)}
      />

      <SettingsSection title='Conta & Seguranca'>
        <SettingsItem
          icon={<Mail size={18} />}
          title='E-mail'
          subtitle={accountLabel}
          onClick={() => setShowEmailModal(true)}
          rightSlot={
            <span className='px-3 py-1 rounded-full bg-slate-800/70 border border-slate-700 text-xs font-semibold text-slate-100'>
              Alterar
            </span>
          }
        />
        <SettingsItem
          icon={<Lock size={18} />}
          title='Senha'
          subtitle={passwordMask}
          onClick={() => setShowPasswordModal(true)}
          rightSlot={
            <span className='px-3 py-1 rounded-full bg-slate-800/70 border border-slate-700 text-xs font-semibold text-slate-100'>
              Alterar
            </span>
          }
        />
        <SettingsItem
          icon={<ShieldOff size={18} className='text-red-300' />}
          title='Excluir conta'
          subtitle='Remove seus dados e acesso'
          danger
          onClick={() => setShowDeleteModal(true)}
          rightSlot={
            <span className='px-3 py-1 rounded-full bg-red-500/15 border border-red-500/50 text-xs font-semibold text-red-200'>
              Excluir
            </span>
          }
        />
      </SettingsSection>

      <SettingsSection title='Aparencia'>
        <SettingsItem
          icon={<div className='h-5 w-5 rounded-full bg-gradient-to-br from-blue-500 to-emerald-400' />}
          title='Tema'
          subtitle={currentThemeName}
          onClick={() => setShowThemeSheet(true)}
          rightSlot={
            <span className='px-3 py-1 rounded-full bg-slate-800/70 border border-slate-700 text-xs font-semibold text-slate-100'>
              Alterar
            </span>
          }
        />
      </SettingsSection>

      <SettingsSection title='Sincronizacao'>
        <SettingsItem
          icon={<Wifi size={18} />}
          title='Status'
          subtitle={syncStatusLine}
          rightSlot={<SyncStatusPill />}
        />
        <SettingsItem
          icon={<Clock3 size={18} />}
          title='Ultima sincronizacao'
          subtitle={lastSyncAt ? 'Automatica' : 'Aguardando primeira sincronizacao'}
          rightSlot={
            <span className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/70 border border-slate-700 text-xs font-semibold text-slate-100'>
              <span className='h-2 w-2 rounded-full bg-emerald-400' />
              {formatSyncAgo(lastSyncAt ?? null)}
            </span>
          }
        />
        <SettingsItem
          icon={<CloudOff size={18} />}
          title='Pendencias offline'
          subtitle={offlineLabel}
          onClick={() => onOpenPendingModal?.()}
          rightSlot={<PendingChangesPill onClick={() => onOpenPendingModal?.()} />}
        />
      </SettingsSection>

      <div className='text-center p-4'>
        <p className='text-slate-600 text-sm'>{versionLabel}</p>
      </div>

      <EmailModal />
      <PasswordModal />
      <DeleteModal />
      <EditPriceSheet
        open={showPriceSheet}
        initialValue={currentPrice}
        onClose={() => setShowPriceSheet(false)}
        onSave={handleSavePrice}
      />
      {showThemeSheet && (
        <div className='fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 backdrop-blur-sm px-3 pb-3'>
          <div
            className='w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl shadow-black/40 overflow-hidden animate-slide-up'
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}
          >
            <div className='px-5 pt-4 pb-3 flex items-center justify-between'>
              <div>
                <p className='text-[11px] uppercase tracking-[0.08em] text-slate-500 font-semibold'>
                  Aparencia
                </p>
                <h2 className='text-lg font-semibold text-white'>Escolher tema</h2>
              </div>
              <button
                onClick={() => setShowThemeSheet(false)}
                className='text-slate-400 hover:text-white text-sm font-semibold'
              >
                Fechar
              </button>
            </div>
            <div className='px-5 pb-5 space-y-2'>
              {themeDefinitions.map((theme) => {
                const isEnabled = theme.enabled
                const isActive = theme.id === themeId
                const label = theme.name + (!isEnabled ? ' (Em breve)' : '')
                return (
                  <button
                    key={theme.id}
                    type='button'
                    disabled={!isEnabled}
                    onClick={() => {
                      if (!isEnabled) return
                      setThemeId(theme.id)
                      setShowThemeSheet(false)
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'border-blue-500/70 bg-blue-500/10 text-white'
                        : 'border-slate-800 bg-slate-800/40 text-slate-100'
                    } ${!isEnabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-[0.99] hover:border-slate-600'}`}
                  >
                    <div className='min-w-0'>
                      <p className='text-sm font-semibold truncate'>{label}</p>
                      {!isEnabled && (
                        <p className='text-xs text-slate-400'>Disponivel futuramente</p>
                      )}
                    </div>
                    <span
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                        isActive ? 'border-blue-400' : 'border-slate-500'
                      } ${isEnabled ? '' : 'opacity-60'}`}
                    >
                      {isActive && <span className='h-2.5 w-2.5 rounded-full bg-blue-400' />}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
