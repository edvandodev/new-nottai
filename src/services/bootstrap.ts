import { firestoreService } from './firestore'
import { getDeviceId } from './device'
import type { PriceSettings } from '@/types'

const PROFILE_PATH = (uid: string) => `users/${uid}/meta/profile`
const PRICE_SETTINGS_PATH = (uid: string) => `users/${uid}/settings/price`

const DEFAULT_PRICE_SETTINGS: PriceSettings = {
  standard: 0,
  custom: 0
}

type EnsureOpts = {
  isAnonymous?: boolean
  displayName?: string | null
}

export async function ensureUserInitialized(
  uid: string,
  opts: EnsureOpts = {}
): Promise<void> {
  try {
    const now = Date.now()
    const deviceId = getDeviceId()

    const profileRef = PROFILE_PATH(uid)
    const existingProfile = await firestoreService.getDoc<any>(profileRef)
    if (!existingProfile) {
      await firestoreService.setDoc(profileRef, {
        schemaVersion: 2,
        createdAt: now,
        updatedAt: now,
        updatedBy: uid,
        deviceId,
        lastLoginAt: now,
        displayName: opts.displayName ?? (opts.isAnonymous ? 'Teste' : null),
        role: 'user',
        isAnonymous: !!opts.isAnonymous
      })
    } else {
      await firestoreService.updateDoc(profileRef, {
        lastLoginAt: now,
        updatedAt: now,
        updatedBy: uid,
        deviceId,
        ...(opts.isAnonymous
          ? {
              isAnonymous: true,
              displayName:
                existingProfile.displayName ?? opts.displayName ?? 'Teste',
              role: existingProfile.role ?? 'user'
            }
          : {})
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
