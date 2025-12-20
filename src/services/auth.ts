import { FirebaseAuthentication } from '@capacitor-firebase/authentication'

export type AppUser = {
  uid: string
  email: string | null
  displayName: string | null
  emailVerified: boolean
  isAnonymous: boolean
}

const CACHE_KEY = 'nottai_last_user'

const mapUser = (user: any): AppUser | null => {
  if (!user?.uid) return null
  return {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    emailVerified: !!user.emailVerified,
    isAnonymous: !!user.isAnonymous
  }
}

const saveCachedUser = (user: AppUser | null) => {
  if (typeof localStorage === 'undefined') return
  if (!user) {
    localStorage.removeItem(CACHE_KEY)
    return
  }
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(user))
  } catch (error) {
    console.warn('Nao foi possivel salvar usuario em cache', error)
  }
}

const loadCachedUser = (): AppUser | null => {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AppUser
    return {
      ...parsed,
      isAnonymous: !!(parsed as any).isAnonymous
    }
  } catch (error) {
    return null
  }
}

export const authService = {
  async setLanguageToPortuguese(): Promise<void> {
    try {
      await FirebaseAuthentication.setLanguageCode({ languageCode: 'pt-BR' })
    } catch (error) {
      console.warn('Nao foi possivel definir idioma pt-BR para emails de auth', error)
    }
  },

  async getCurrentUser(): Promise<AppUser | null> {
    try {
      const { user } = await FirebaseAuthentication.getCurrentUser()
      const mapped = mapUser(user)
      if (mapped) {
        saveCachedUser(mapped)
        return mapped
      }
      const cached = loadCachedUser()
      return cached
    } catch (error) {
      const cached = loadCachedUser()
      if (cached) return cached
      throw error
    }
  },

  onAuthStateChange(cb: (user: AppUser | null) => void): () => void {
    let cancelled = false

    const listenerPromise = FirebaseAuthentication.addListener(
      'authStateChange',
      (event) => {
        if (cancelled) return
        const mapped = mapUser(event.user)
        saveCachedUser(mapped)
        cb(mapped)
      }
    )

    return async () => {
      cancelled = true
      try {
        const handle = await listenerPromise
        await handle.remove()
      } catch (error) {
        console.error('Falha ao remover listener de auth', error)
      }
    }
  },

  async signUp(email: string, password: string): Promise<AppUser> {
    const { user } = await FirebaseAuthentication.createUserWithEmailAndPassword(
      { email, password }
    )
    await FirebaseAuthentication.sendEmailVerification()
    const mapped = mapUser(user)
    if (!mapped) throw new Error('Falha ao criar usuario')
    saveCachedUser(mapped)
    return mapped
  },

  async signIn(email: string, password: string): Promise<AppUser> {
    const { user } = await FirebaseAuthentication.signInWithEmailAndPassword({
      email,
      password
    })
    const mapped = mapUser(user)
    if (!mapped) throw new Error('Credenciais invalidas')
    saveCachedUser(mapped)
    return mapped
  },

  async signOut(): Promise<void> {
    await FirebaseAuthentication.signOut()
    saveCachedUser(null)
  },

  async signInAnonymously(): Promise<AppUser> {
    const { user } = await FirebaseAuthentication.signInAnonymously()
    if (user && !user.displayName) {
      try {
        await FirebaseAuthentication.updateProfile({ displayName: 'Teste' })
      } catch (error) {
        console.warn('Nao foi possivel definir displayName para anonimo', error)
      }
    }
    const mapped = mapUser(user)
    if (!mapped) throw new Error('Falha ao entrar como convidado')
    saveCachedUser(mapped)
    return mapped
  },

  async sendPasswordReset(email: string): Promise<void> {
    await FirebaseAuthentication.sendPasswordResetEmail({ email })
  },

  async sendEmailVerification(): Promise<void> {
    await FirebaseAuthentication.sendEmailVerification()
  },

  async reloadUser(): Promise<AppUser | null> {
    await FirebaseAuthentication.reload()
    const current = await authService.getCurrentUser()
    saveCachedUser(current)
    return current
  },

  async reauthWithPassword(email: string, password: string): Promise<void> {
    await FirebaseAuthentication.signInWithEmailAndPassword({ email, password })
  },

  async updateEmail(newEmail: string): Promise<void> {
    await FirebaseAuthentication.updateEmail({ newEmail })
  },

  async updatePassword(newPassword: string): Promise<void> {
    await FirebaseAuthentication.updatePassword({ newPassword })
  },

  async deleteUser(): Promise<void> {
    await FirebaseAuthentication.deleteUser()
    saveCachedUser(null)
  }
}
