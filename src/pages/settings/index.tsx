import React, { useEffect, useState } from 'react'
import { DollarSign, Tag } from 'lucide-react'
import type { PriceSettings } from '@/types'
import { authService } from '@/services/auth'
import { firestoreService } from '@/services/firestore'
import { SyncStatusPill } from '@/components/SyncStatusPill'
import { PendingChangesPill } from '@/components/PendingChangesPill'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { usePendingQueue } from '@/hooks/usePendingQueue'

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
  const [standardPriceInput, setStandardPriceInput] = useState('0')
  const [customPriceInput, setCustomPriceInput] = useState('0')
  const [isSaving, setIsSaving] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    setStandardPriceInput(String(priceSettings?.standard ?? 0))
    setCustomPriceInput(String(priceSettings?.custom ?? 0))
  }, [priceSettings])

  const { isOnline, lastSyncAt } = useSyncStatus()
  const { pendingCount, failedCount } = usePendingQueue()

  const parsePrice = (v: string) => {
    const n = Number(String(v).replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }

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

  const handleSave = async () => {
    const next: PriceSettings = {
      standard: parsePrice(standardPriceInput),
      custom: parsePrice(customPriceInput)
    }

    try {
      setIsSaving(true)
      await onSavePriceSettings(next)
      alert('Precos atualizados com sucesso!')
    } catch (error) {
      console.error('Falha ao salvar precos', error)
      alert('Nao foi possivel salvar os precos. Tente novamente.')
    } finally {
      setIsSaving(false)
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

  const SettingsRow = ({
    title,
    description,
    actionLabel,
    onClick,
    danger = false
  }: {
    title: string
    description: string
    actionLabel: string
    onClick: () => void
    danger?: boolean
  }) => (
    <button
      type='button'
      onClick={onClick}
      className='w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-900/60 transition-colors active:scale-[0.99]'
    >
      <div className='min-w-0'>
        <p className='text-sm font-semibold text-white truncate'>{title}</p>
        <p className='text-xs text-slate-400 truncate'>{description}</p>
      </div>
      <span
        className={`text-sm font-semibold ${
          danger ? 'text-red-300' : 'text-blue-200'
        }`}
      >
        {actionLabel}
      </span>
    </button>
  )

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
      <div className='fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center px-4 z-50'>
        <div className='w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4'>
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

  return (
    <div
      className='space-y-5 animate-fade-in'
      style={{
        paddingBottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))'
      }}
    >
      {onSignOut && (
        <div className='bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4'>
          <div className='flex items-center gap-3 min-w-0'>
            <div className='h-11 w-11 rounded-full border border-blue-500/30 bg-blue-600/15 text-blue-200 font-bold flex items-center justify-center shadow-inner shadow-blue-900/30'>
              {userInitial}
            </div>
            <div className='min-w-0'>
              <p className='text-[11px] uppercase tracking-wide text-slate-500 font-semibold'>
                Logado como
              </p>
              <p className='text-sm font-semibold text-white truncate'>
                {accountLabel}
              </p>
              {currentUserIsAnonymous && (
                <p className='text-[11px] text-slate-400'>Conta: Convidado (Teste)</p>
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

      <div className='bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-900/60 border border-slate-800 rounded-2xl shadow-lg shadow-black/30 p-5 space-y-5'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <p className='text-[11px] uppercase tracking-wide text-slate-500 font-semibold'>
              Precificacao
            </p>
            <h2 className='text-xl font-bold text-white'>Configuracao de precos</h2>
            <p className='text-sm text-slate-400'>Valores que aparecem nas tabelas.</p>
          </div>
          <div className='h-10 w-10 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-200 flex items-center justify-center shadow-inner shadow-blue-900/20'>
            <DollarSign size={18} />
          </div>
        </div>

        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='space-y-2'>
            <label className='text-sm font-semibold text-slate-200'>
              Preco padrao (R$/L)
            </label>
            <div className='rounded-2xl border border-slate-800 bg-slate-950/50 shadow-inner shadow-black/10'>
              <input
                type='number'
                step='0.01'
                className='w-full bg-transparent px-4 py-3 text-lg font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 rounded-2xl'
                value={standardPriceInput}
                onChange={(e) => setStandardPriceInput(e.target.value)}
              />
            </div>
            <p className='text-xs text-slate-400'>Valor aplicado por padrao.</p>
          </div>

          <div className='space-y-2'>
            <label className='text-sm font-semibold text-slate-200 flex items-center gap-2'>
              <Tag size={16} className='text-purple-300' />
              <span>Preco personalizado (R$/L)</span>
            </label>
            <div className='rounded-2xl border border-slate-800 bg-slate-950/50 shadow-inner shadow-black/10'>
              <input
                type='number'
                step='0.01'
                className='w-full bg-transparent px-4 py-3 text-lg font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/60 rounded-2xl'
                value={customPriceInput}
                onChange={(e) => setCustomPriceInput(e.target.value)}
              />
            </div>
            <p className='text-xs text-slate-400'>Use quando precisar de excecao.</p>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className='w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-2xl font-semibold transition-all shadow-lg shadow-blue-900/40 active:scale-[0.99]'
      >
        {isSaving ? 'Salvando...' : 'Salvar'}
      </button>

      <div className='bg-slate-900/70 border border-slate-800 rounded-2xl shadow-sm p-5 space-y-3'>
        <div>
          <h2 className='text-lg font-bold text-white'>Conta & Seguranca</h2>
          <p className='text-slate-400 text-sm'>Dados de acesso.</p>
        </div>
        <div className='rounded-2xl border border-slate-900/80 bg-slate-950/40 divide-y divide-slate-900'>
          <SettingsRow
            title='E-mail'
            description={accountLabel}
            actionLabel='Alterar'
            onClick={() => setShowEmailModal(true)}
          />
          <SettingsRow
            title='Senha'
            description={passwordMask}
            actionLabel='Alterar'
            onClick={() => setShowPasswordModal(true)}
          />
          <SettingsRow
            title='Excluir conta'
            description='Remove seus dados e acesso'
            actionLabel='Excluir'
            danger
            onClick={() => setShowDeleteModal(true)}
          />
        </div>
      </div>

      <div className='bg-slate-900/70 border border-slate-800 rounded-2xl shadow-sm p-5 space-y-4'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <h2 className='text-lg font-bold text-white'>Sincronizacao</h2>
            <p className='text-sm text-slate-400'>{syncStatusLine}</p>
          </div>
          <SyncStatusPill />
        </div>
        <div className='flex items-center gap-2'>
          <span className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/70 border border-slate-700 text-[11px] font-semibold text-slate-100'>
            <span className='h-2 w-2 rounded-full bg-emerald-400' />
            {formatSyncAgo(lastSyncAt)}
          </span>
        </div>
        <div className='flex items-center justify-between text-sm text-slate-300'>
          <span>{offlineLabel}</span>
          <PendingChangesPill onClick={() => onOpenPendingModal?.()} />
        </div>
      </div>

      <div className='text-center p-4'>
        <p className='text-slate-600 text-sm'>{versionLabel}</p>
      </div>

      <EmailModal />
      <PasswordModal />
      <DeleteModal />
    </div>
  )
}


