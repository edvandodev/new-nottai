import React, { useMemo, useState } from 'react'
import { ArrowRight, Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react'
import logoImage from '../../../assets/icon/Anotaai-01.svg'
import loginIllustration from '../../../assets/icon/ilustra\u00e7\u00e3o-login2.svg'
import { authService } from '@/services/auth'

type Mode = 'signin' | 'signup'

type ResetState = {
  open: boolean
  email: string
  error: string | null
  success: string | null
  loading: boolean
}

const accentColor = '#C7F000'
const gradientBackground = 'linear-gradient(180deg, #0B1220 0%, #05070D 100%)'

const translateError = (error: any) => {
  const code = (error?.code || error?.message || '').toString()
  if (code.includes('email-already-in-use')) return 'E-mail j\u00e1 est\u00e1 em uso.'
  if (code.includes('weak-password') || code.includes('password')) {
    return 'Senha muito fraca. Use pelo menos 6 caracteres.'
  }
  if (
    code.includes('invalid-credential') ||
    code.includes('invalid-login') ||
    code.includes('invalid-email')
  ) {
    return 'Credenciais inv\u00e1lidas. Verifique e-mail e senha.'
  }
  return 'N\u00e3o foi poss\u00edvel completar a a\u00e7\u00e3o. Tente novamente.'
}

const translateResetError = (error: any) => {
  const code = (error?.code || error?.message || '').toString()
  if (code.includes('invalid-email')) return 'Informe um e-mail v\u00e1lido.'
  if (code.includes('user-not-found')) return 'Se existir uma conta, enviaremos o e-mail.'
  return 'N\u00e3o foi poss\u00edvel enviar o e-mail. Tente novamente.'
}

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [reset, setReset] = useState<ResetState>({
    open: false,
    email: '',
    error: null,
    success: null,
    loading: false
  })
  const [showPassword, setShowPassword] = useState(false)

  const title = useMemo(
    () => (mode === 'signin' ? 'Bem-vindo de volta' : 'Crie sua conta'),
    [mode]
  )

  const subtitle = useMemo(
    () =>
      mode === 'signin'
        ? 'Acesse sua conta para continuar.'
        : 'Preencha os dados para come\u00e7ar a usar o Anota A\u00ed.',
    [mode]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Informe um e-mail.')
      return
    }
    if (!/.+@.+\..+/.test(trimmedEmail)) {
      setError('Informe um e-mail v\u00e1lido.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('As senhas n\u00e3o conferem.')
      return
    }

    try {
      setLoading(true)
      if (mode === 'signin') {
        await authService.signIn(trimmedEmail, password)
      } else {
        await authService.signUp(trimmedEmail, password)
        setInfo('Conta criada! Verifique seu e-mail para ativar sua conta.')
      }
    } catch (err) {
      setError(translateError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGuestSignIn = async () => {
    setError(null)
    setInfo(null)
    try {
      setGuestLoading(true)
      await authService.signInAnonymously()
      setInfo('Entrou como convidado (teste).')
    } catch (err) {
      setError('N\u00e3o foi poss\u00edvel entrar como convidado.')
    } finally {
      setGuestLoading(false)
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
      setReset((prev) => ({ ...prev, error: 'Informe um e-mail.' }))
      return
    }
    if (!/.+@.+\\..+/.test(trimmedEmail)) {
      setReset((prev) => ({ ...prev, error: 'Informe um e-mail v\u00e1lido.' }))
      return
    }

    try {
      setReset((prev) => ({ ...prev, loading: true }))
      await authService.sendPasswordReset(trimmedEmail)
      setReset((prev) => ({
        ...prev,
        success:
          'Se existir uma conta, enviamos um e-mail para redefinir sua senha.',
        error: null
      }))
    } catch (err) {
      setReset((prev) => ({ ...prev, error: translateResetError(err) }))
    } finally {
      setReset((prev) => ({ ...prev, loading: false }))
    }
  }

  return (
    <div
      className='relative min-h-screen text-white'
      style={{
        background: gradientBackground,
        color: '#FFFFFF',
        fontFamily: "'Inter','Poppins','DM Sans','Segoe UI',sans-serif"
      }}
    >
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(199,240,0,0.12),transparent_32%),radial-gradient(circle_at_80%_68%,rgba(199,240,0,0.08),transparent_30%)] opacity-70 pointer-events-none' />

      <div
        className='relative z-10 flex min-h-screen justify-center px-6 overflow-y-auto'
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)'
        }}
      >
        <div className='w-full max-w-md flex flex-col gap-7'>
          <header className='flex justify-center'>
            <img src={logoImage} alt='Logo Anota A\u00ed' className='h-16 md:h-20 w-auto object-contain' />
          </header>

          <div className='flex justify-center'>
            <img
              src={loginIllustration}
              alt='Ilustra\u00e7\u00e3o do login'
              className='w-full max-w-sm max-h-[40vh] object-contain'
            />
          </div>

          <div className='relative pt-1'>
            <div
              className='pointer-events-none absolute left-[-24px] right-[-24px] bottom-[-28px]'
              style={{
                top: '55%',
                zIndex: 0,
                background:
                  'linear-gradient(180deg, rgba(5,7,13,0) 0%, rgba(5,7,13,0.2) 45%, rgba(5,7,13,0.55) 100%)'
              }}
            />

            <div className='space-y-6 relative z-10'>
              <div className='space-y-1 text-center'>
                <p className='text-xs font-semibold uppercase tracking-[0.2em] text-[#A7B0BF]'>
                  login
                </p>
                <h1 className='text-[26px] font-semibold leading-tight'>Seja bem-vindo</h1>
                <p className='text-sm text-[#A7B0BF]'>Acesse sua conta para continuar.</p>
              </div>

              {error && (
                <div className='p-3 rounded-xl border border-red-500/40 bg-red-500/10 text-red-100 text-sm'>
                  {error}
                </div>
              )}

              {info && (
                <div
                  className='p-3 rounded-xl text-sm'
                  style={{
                    border: `1px solid ${accentColor}40`,
                    backgroundColor: `${accentColor}14`,
                    color: '#d8ff4a'
                  }}
                >
                  {info}
                </div>
              )}

              <form className='space-y-4' onSubmit={handleSubmit}>
                <div className='space-y-2'>
                  <div className='flex items-center gap-3 rounded-[14px] bg-[rgba(15,23,42,0.55)] border border-white/10 px-4 h-[52px] transition-all focus-within:border-[#C7F000] focus-within:ring-1 focus-within:ring-[#C7F000]'>
                    <Mail size={18} className='text-[#C7F000]' />
                    <input
                      type='email'
                      inputMode='email'
                      autoComplete='email'
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className='flex-1 bg-transparent text-white placeholder:text-[#6b7484] focus:outline-none'
                      placeholder='Seu e-mail'
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className='space-y-2'>
                  <div className='flex items-center gap-3 rounded-[14px] bg-[rgba(15,23,42,0.55)] border border-white/10 px-4 h-[52px] transition-all focus-within:border-[#C7F000] focus-within:ring-1 focus-within:ring-[#C7F000]'>
                    <Lock size={18} className='text-[#C7F000]' />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete='current-password'
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className='flex-1 bg-transparent text-white placeholder:text-[#6b7484] focus:outline-none'
                      placeholder='Sua senha'
                      disabled={loading}
                      minLength={6}
                      required
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword((prev) => !prev)}
                      className='text-[#A7B0BF] hover:text-white transition-colors'
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {mode === 'signup' && (
                  <div className='space-y-2'>
                    <div className='flex items-center gap-3 rounded-[14px] bg-[rgba(15,23,42,0.55)] border border-white/10 px-4 h-[52px] transition-all focus-within:border-[#C7F000] focus-within:ring-1 focus-within:ring-[#C7F000]'>
                      <Lock size={18} className='text-[#C7F000]' />
                      <input
                        type='password'
                        autoComplete='new-password'
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className='flex-1 bg-transparent text-white placeholder:text-[#6b7484] focus:outline-none'
                        placeholder='Confirme sua senha'
                        disabled={loading}
                        minLength={6}
                        required
                      />
                    </div>
                  </div>
                )}

                {mode === 'signin' && (
                  <div className='flex justify-end'>
                    <button
                      type='button'
                      onClick={openReset}
                      className='text-xs font-semibold text-[#C7F000] hover:underline underline-offset-4 transition-colors'
                      disabled={loading}
                    >
                      Esqueceu sua senha?
                    </button>
                  </div>
                )}

                <div className='space-y-3 pt-1'>
                  <button
                    type='submit'
                    disabled={loading}
                    className='w-full h-[52px] rounded-[14px] bg-[#C7F000] text-[#05070D] font-semibold flex items-center justify-center gap-2 transition-transform duration-150 hover:bg-[#d4ff33] active:translate-y-[1px] disabled:opacity-70'
                  >
                    {loading ? (
                      <span className='animate-pulse'>Carregando...</span>
                    ) : (
                      <>
                        <ArrowRight size={18} />
                        {mode === 'signin' ? 'Entrar' : 'Criar conta'}
                      </>
                    )}
                  </button>

                  {mode === 'signin' && (
                    <button
                      type='button'
                      onClick={handleGuestSignIn}
                      disabled={guestLoading || loading}
                      className='w-full h-[52px] rounded-[14px] border border-[#C7F000] text-[#C7F000] font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-[#c7f000]/10 disabled:opacity-60'
                    >
                      {guestLoading ? (
                        'Entrando...'
                      ) : (
                        <>
                          <UserRound size={18} />
                          Entrar como convidado
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>

              <div className='pt-2 text-center text-sm text-[#A7B0BF]'>
                {mode === 'signin' ? (
                  <>
                    Não tem uma conta?{' '}
                    <button
                      type='button'
                      className='text-[#C7F000] font-semibold hover:underline underline-offset-4 transition-colors'
                      onClick={() => {
                        setMode('signup')
                        setError(null)
                        setInfo(null)
                      }}
                      disabled={loading}
                    >
                      Crie agora
                    </button>
                  </>
                ) : (
                  <>
                    Já tem uma conta?{' '}
                    <button
                      type='button'
                      className='text-[#C7F000] font-semibold hover:underline underline-offset-4 transition-colors'
                      onClick={() => {
                        setMode('signin')
                        setError(null)
                        setInfo(null)
                        setConfirmPassword('')
                      }}
                      disabled={loading}
                    >
                      Entrar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {reset.open && (
        <div className='fixed inset-0 z-30 bg-black/70 flex items-center justify-center px-4'>
          <div className='w-full max-w-sm rounded-2xl bg-[#0F172A] border border-[#1f2a3c] p-6 shadow-[0_18px_42px_-36px_rgba(0,0,0,0.85)] space-y-4'>
            <div className='flex items-center justify-between gap-4'>
              <div>
                <p className='text-base font-semibold text-white'>Recuperar senha</p>
                <p className='text-xs text-[#9AA4B2]'>Enviaremos um link para o seu e-mail.</p>
              </div>
              <button
                onClick={closeReset}
                className='text-[#9AA4B2] hover:text-white text-sm'
                disabled={reset.loading}
              >
                Fechar
              </button>
            </div>

            {reset.error && (
              <div className='p-3 rounded-xl border border-red-500/40 bg-red-500/10 text-red-100 text-sm'>
                {reset.error}
              </div>
            )}
            {reset.success && (
              <div className='p-3 rounded-xl border border-[#c7f000]/30 bg-[#c7f000]/10 text-[#d8ff4a] text-sm'>
                {reset.success}
              </div>
            )}

            <form className='space-y-3' onSubmit={handleResetSubmit}>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-white'>E-mail</label>
                <div className='flex items-center gap-3 rounded-xl border border-[#1f2a3c] bg-[#0F172A] px-4 py-3 transition-all focus-within:border-[#C7F000] focus-within:ring-1 focus-within:ring-[#C7F000]'>
                  <Mail size={18} className='text-[#C7F000]' />
                  <input
                    type='email'
                    value={reset.email}
                    onChange={(e) => setReset((prev) => ({ ...prev, email: e.target.value }))}
                    className='flex-1 bg-transparent text-white placeholder:text-[#6b7484] focus:outline-none'
                    placeholder='Seu e-mail'
                    disabled={reset.loading}
                    required
                  />
                </div>
              </div>

              <button
                type='submit'
                disabled={reset.loading}
                className='w-full h-11 rounded-[12px] bg-[#C7F000] text-[#05070D] font-semibold flex items-center justify-center gap-2 transition-transform duration-150 hover:bg-[#d4ff33] active:translate-y-[1px] disabled:opacity-70'
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
