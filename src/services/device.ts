const DEVICE_KEY = 'nottai_device_id'

export function getDeviceId(): string {
  if (typeof localStorage !== 'undefined') {
    const existing = localStorage.getItem(DEVICE_KEY)
    if (existing) return existing
    const generated = generateId()
    localStorage.setItem(DEVICE_KEY, generated)
    return generated
  }
  return generateId()
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `dev-${Math.random().toString(16).slice(2)}-${Date.now()}`
}
