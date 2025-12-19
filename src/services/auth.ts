import { FirebaseAuthentication } from '@capacitor-firebase/authentication'

export type AppUser = {
  uid: string
  email: string | null
  displayName: string | null
  emailVerified: boolean
}

const mapUser = (user: any): AppUser | null => {
  if (!user?.uid) return null
  return {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    emailVerified: !!user.emailVerified
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
    const { user } = await FirebaseAuthentication.getCurrentUser()
    return mapUser(user)
  },

  onAuthStateChange(cb: (user: AppUser | null) => void): () => void {
    let cancelled = false

    const listenerPromise = FirebaseAuthentication.addListener(
      'authStateChange',
      (event) => {
        if (cancelled) return
        cb(mapUser(event.user))
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
    return mapped
  },

  async signIn(email: string, password: string): Promise<AppUser> {
    const { user } = await FirebaseAuthentication.signInWithEmailAndPassword({
      email,
      password
    })
    const mapped = mapUser(user)
    if (!mapped) throw new Error('Credenciais invalidas')
    return mapped
  },

  async signOut(): Promise<void> {
    await FirebaseAuthentication.signOut()
  },

  async sendPasswordReset(email: string): Promise<void> {
    await FirebaseAuthentication.sendPasswordResetEmail({ email })
  },

  async sendEmailVerification(): Promise<void> {
    await FirebaseAuthentication.sendEmailVerification()
  },

  async reloadUser(): Promise<AppUser | null> {
    await FirebaseAuthentication.reload()
    return authService.getCurrentUser()
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
  }
}
