import { firestoreService } from './firestore'
import type { PriceSettings } from '@/types'

const PROFILE_PATH = (uid: string) => `users/${uid}/meta/profile`
const PRICE_SETTINGS_PATH = (uid: string) => `users/${uid}/settings/price`

const DEFAULT_PRICE_SETTINGS: PriceSettings = {
  standard: 0,
  custom: 0
}

export async function ensureUserInitialized(uid: string): Promise<void> {
  try {
    const now = Date.now()

    const profileRef = PROFILE_PATH(uid)
    const existingProfile = await firestoreService.getDoc<any>(profileRef)
    if (!existingProfile) {
      await firestoreService.setDoc(profileRef, {
        schemaVersion: 1,
        createdAt: now,
        lastLoginAt: now
      })
    } else {
      await firestoreService.updateDoc(profileRef, {
        lastLoginAt: now
      })
    }

    const priceRef = PRICE_SETTINGS_PATH(uid)
    const existingPrice = await firestoreService.getDoc<PriceSettings>(priceRef)
    if (!existingPrice) {
      await firestoreService.setDoc(priceRef, DEFAULT_PRICE_SETTINGS)
    }
  } catch (error) {
    console.error('Erro ao inicializar conta do usuario', error)
    throw error
  }
}
