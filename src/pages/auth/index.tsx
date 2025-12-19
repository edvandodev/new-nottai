import React, { useMemo, useState } from 'react'
import { LogIn, UserPlus, Mail, Lock } from 'lucide-react'
import { authService } from '@/services/auth'

type Mode = 'signin' | 'signup'

type ResetState = {
  open: boolean
  email: string
  error: string | null
  success: string | null
  loading: boolean
}

const translateError = (error: any) => {
  const code = (error?.code || error?.message || '').toString()
  if (code.includes('email-already-in-use')) return 'Email ja esta em uso.'
  if (code.includes('weak-password') || code.includes('password')) {
    return 'Senha muito fraca. Use pelo menos 6 caracteres.'
  }
  if (
    code.includes('invalid-credential') ||
    code.includes('invalid-login') ||
    code.includes('invalid-email')
  ) {
    return 'Credenciais invalidas. Verifique email e senha.'
  }
  return 'Nao foi possivel completar a acao. Tente novamente.'
}

const translateResetError = (error: any) => {
  const code = (error?.code || error?.message || '').toString()
  if (code.includes('invalid-email')) return 'Informe um email valido.'
  if (code.includes('user-not-found')) return 'Se existir uma conta, enviaremos o email.'
  return 'Nao foi possivel enviar o email. Tente novamente.'
}

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [reset, setReset] = useState<ResetState>({
    open: false,
    email: '',
    error: null,
    success: null,
    loading: false
  })

  const title = useMemo(
    () => (mode === 'signin' ? 'Bem-vindo de volta' : 'Crie sua conta'),
    [mode]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Informe um email.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('As senhas nao conferem.')
      return
    }

    try {
      setLoading(true)
      if (mode === 'signin') {
        await authService.signIn(trimmedEmail, password)
      } else {
        await authService.signUp(trimmedEmail, password)
        setInfo('Conta criada! Verifique seu email para ativar sua conta.')
      }
    } catch (err) {
      setError(translateError(err))
    } finally {
      setLoading(false)
    }
  }

  const openReset = () => {
    setReset({ open: true, email, error: null, success: null, loading: false })
  }

  const closeReset = () => {
    setReset((prev) => ({ ...prev, open: false, error: null, success: null }))
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setReset((prev) => ({ ...prev, error: null, success: null }))
    const trimmedEmail = reset.email.trim()
    if (!trimmedEmail) {
      setReset((prev) => ({ ...prev, error: 'Informe um email.' }))
      return
    }
    if (!/.+@.+\..+/.test(trimmedEmail)) {
      setReset((prev) => ({ ...prev, error: 'Informe um email valido.' }))
      return
    }

    try {
      setReset((prev) => ({ ...prev, loading: true }))
      await authService.sendPasswordReset(trimmedEmail)
      setReset((prev) => ({
        ...prev,
        success: 'Se existir uma conta, enviamos um email para redefinir sua senha.',
        error: null
      }))
    } catch (err) {
      setReset((prev) => ({ ...prev, error: translateResetError(err) }))
    } finally {
      setReset((prev) => ({ ...prev, loading: false }))
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex items-center justify-center px-4'>
      <div className='w-full max-w-md'>
        <div className='flex justify-center mb-6'>
          <div className='h-14 w-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-900/40'>
            {mode === 'signin' ? <LogIn size={26} /> : <UserPlus size={26} />}
          </div>
        </div>

        <div className='bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl shadow-blue-900/30 overflow-hidden'>
          <div className='grid grid-cols-2 bg-slate-800/60'>
            <button
              className={`py-3 text-sm font-semibold tracking-wide transition-all ${
                mode === 'signin'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => {
                setMode('signin')
                setError(null)
                setInfo(null)
              }}
              disabled={loading}
            >
              Entrar
            </button>
            <button
              className={`py-3 text-sm font-semibold tracking-wide transition-all ${
                mode === 'signup'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-white'
              }`}
              onClick={() => {
                setMode('signup')
                setError(null)
                setInfo(null)
              }}
              disabled={loading}
            >
              Criar conta
            </button>
          </div>

          <div className='p-6 space-y-6'>
            <div>
              <h1 className='text-2xl font-bold text-white'>{title}</h1>
              <p className='text-slate-400 text-sm mt-1'>
                Acesse ou crie sua conta para continuar.
              </p>
            </div>

            {error && (
              <div className='p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-sm'>
                {error}
              </div>
            )}

            {info && (
              <div className='p-3 rounded-lg border border-blue-500/40 bg-blue-500/10 text-blue-100 text-sm'>
                {info}
              </div>
            )}

            <form className='space-y-4' onSubmit={handleSubmit}>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-slate-200 flex items-center gap-2'>
                  <Mail size={16} className='text-blue-400' />
                  Email
                </label>
                <input
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className='w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                  placeholder='voce@email.com'
                  disabled={loading}
                  required
                />
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium text-slate-200 flex items-center gap-2'>
                  <Lock size={16} className='text-blue-400' />
                  Senha
                </label>
                <input
                  type='password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className='w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                  placeholder='********'
                  disabled={loading}
                  minLength={6}
                  required
                />
              </div>

              {mode === 'signup' && (
                <div className='space-y-2'>
                  <label className='text-sm font-medium text-slate-200 flex items-center gap-2'>
                    <Lock size={16} className='text-blue-400' />
                    Confirmar senha
                  </label>
                  <input
                    type='password'
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className='w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                    placeholder='Repita a senha'
                    disabled={loading}
                    minLength={6}
                    required
                  />
                </div>
              )}

              {mode === 'signin' && (
                <div className='flex justify-end'>
                  <button
                    type='button'
                    onClick={openReset}
                    className='text-xs text-blue-300 hover:text-blue-200 underline'
                    disabled={loading}
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}

              <button
                type='submit'
                disabled={loading}
                className='w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg font-semibold transition-all shadow-lg shadow-blue-900/40 active:scale-[0.99] flex items-center justify-center gap-2'
              >
                {loading ? (
                  <span className='animate-pulse'>Carregando...</span>
                ) : mode === 'signin' ? (
                  <>
                    <LogIn size={18} />
                    Entrar
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    Criar conta
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {reset.open && (
        <div className='fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center px-4'>
          <div className='w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl shadow-black/50 space-y-4'>
            <div className='flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-white'>Redefinir senha</h2>
              <button
                onClick={closeReset}
                className='text-slate-400 hover:text-white text-sm'
                disabled={reset.loading}
              >
                Fechar
              </button>
            </div>

            {reset.error && (
              <div className='p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-sm'>
                {reset.error}
              </div>
            )}
            {reset.success && (
              <div className='p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-100 text-sm'>
                {reset.success}
              </div>
            )}

            <form className='space-y-3' onSubmit={handleResetSubmit}>
              <div className='space-y-1'>
                <label className='text-sm text-slate-300'>Email</label>
                <input
                  type='email'
                  value={reset.email}
                  onChange={(e) => setReset((prev) => ({ ...prev, email: e.target.value }))}
                  className='w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                  placeholder='voce@email.com'
                  disabled={reset.loading}
                  required
                />
              </div>

              <button
                type='submit'
                disabled={reset.loading}
                className='w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg font-semibold transition-all active:scale-[0.99]'
              >
                {reset.loading ? 'Enviando...' : 'Enviar link'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
