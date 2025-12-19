import React, { useEffect, useState } from 'react'
import { DollarSign, Tag } from 'lucide-react'
import type { PriceSettings } from '@/types'
import { authService } from '@/services/auth'
import { firestoreService } from '@/services/firestore'

type SettingsPageProps = {
  priceSettings: PriceSettings
  onSavePriceSettings: (next: PriceSettings) => void | Promise<void>
  versionLabel?: string
  currentUserEmail?: string
  currentUserId?: string
  onSignOut?: () => void | Promise<void>
}

export function SettingsPage({
  priceSettings,
  onSavePriceSettings,
  versionLabel = 'Nottai',
  currentUserEmail,
  currentUserId,
  onSignOut
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

  const parsePrice = (v: string) => {
    const n = Number(String(v).replace(',', '.'))
    return Number.isFinite(n) ? n : 0
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

  const AccountCard = ({
    title,
    description,
    actionLabel,
    onClick
  }: {
    title: string
    description: string
    actionLabel: string
    onClick: () => void
  }) => (
    <div className='p-4 bg-slate-900/60 rounded-xl border border-slate-700/60 flex items-center justify-between'>
      <div>
        <p className='text-sm text-slate-200 font-semibold'>{title}</p>
        <p className='text-xs text-slate-400'>{description}</p>
      </div>
      <button
        onClick={onClick}
        className='text-sm font-semibold text-blue-300 hover:text-blue-200 underline'
      >
        {actionLabel}
      </button>
    </div>
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

  return (
    <div className='space-y-6 animate-fade-in'>
      {onSignOut && (
        <div className='bg-slate-800 rounded-xl p-6 border border-slate-700 flex items-center justify-between gap-4'>
          <div>
            <p className='text-sm text-slate-400'>Conta</p>
            <p className='text-base text-white font-semibold'>
              Logado como: {currentUserEmail || 'Sem email'}
            </p>
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
            className='px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg text-sm font-semibold transition-colors'
          >
            {isSigningOut ? 'Saindo...' : 'Sair'}
          </button>
        </div>
      )}

      <div className='bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4'>
        <div>
          <h2 className='text-lg font-bold text-white'>Conta & Seguranca</h2>
          <p className='text-slate-400 text-sm'>
            Gerencie seu acesso e proteja seus dados.
          </p>
        </div>
        <div className='text-sm text-slate-300'>
          E-mail atual:{' '}
          <span className='text-white font-semibold'>
            {currentUserEmail || 'Sem email'}
          </span>
        </div>
        <div className='space-y-3'>
          <AccountCard
            title='Alterar e-mail'
            description='Atualize seu e-mail de login'
            actionLabel='Alterar'
            onClick={() => setShowEmailModal(true)}
          />
          <AccountCard
            title='Alterar senha'
            description='Defina uma nova senha segura'
            actionLabel='Alterar'
            onClick={() => setShowPasswordModal(true)}
          />
          <AccountCard
            title='Excluir conta'
            description='Remova seus dados e acesso'
            actionLabel='Excluir'
            onClick={() => setShowDeleteModal(true)}
          />
        </div>
      </div>

      <div className='bg-slate-800 rounded-xl p-6 border border-slate-700'>
        <div className='flex items-center gap-3 mb-6'>
          <div className='p-2 bg-blue-600/20 rounded-lg text-blue-400'>
            <DollarSign size={24} />
          </div>
          <div>
            <h2 className='text-lg font-bold text-white'>
              Configuracao de Precos
            </h2>
            <p className='text-slate-400 text-sm'>
              Defina os valores das tabelas
            </p>
          </div>
        </div>

        <div className='space-y-5'>
          <div className='p-4 bg-slate-900/50 rounded-xl border border-slate-700/50'>
            <label className='block text-sm font-medium text-blue-400 mb-2'>
              Preco Padrao (R$)
            </label>
            <input
              type='number'
              step='0.01'
              className='w-full p-4 bg-slate-800 border border-slate-600 rounded-lg text-white text-xl font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none'
              value={standardPriceInput}
              onChange={(e) => setStandardPriceInput(e.target.value)}
            />
            <p className='text-xs text-slate-500 mt-2'>
              Usado pela maioria dos clientes.
            </p>
          </div>

          <div className='p-4 bg-slate-900/50 rounded-xl border border-slate-700/50'>
            <div className='flex items-center gap-2 mb-2'>
              <Tag size={16} className='text-purple-400' />
              <label className='block text-sm font-medium text-purple-400'>
                Preco Personalizado (R$)
              </label>
            </div>
            <input
              type='number'
              step='0.01'
              className='w-full p-4 bg-slate-800 border border-slate-600 rounded-lg text-white text-xl font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none'
              value={customPriceInput}
              onChange={(e) => setCustomPriceInput(e.target.value)}
            />
            <p className='text-xs text-slate-500 mt-2'>
              Valor alternativo selecionavel no cadastro do cliente.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className='w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-blue-900/40 mt-2 active:scale-[0.99]'
          >
            {isSaving ? 'Salvando...' : 'Salvar Alteracoes'}
          </button>
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
