export type PriceType = 'STANDARD' | 'CUSTOM'

export type Client = {
  id: string
  name: string
  phone: string
  priceType: PriceType
  avatar?: string
  createdAt?: number
  updatedAt?: number
  updatedBy?: string
  deviceId?: string
}

export type PaymentStatus = 'PRAZO' | 'AVISTA'

export type Sale = {
  id: string
  clientId: string
  date: string
  liters: number
  pricePerLiter: number
  totalValue: number
  paymentStatus: PaymentStatus
  isPaid?: boolean
  createdAt?: number
  updatedAt?: number
  updatedBy?: string
  deviceId?: string
}

export type Payment = {
  id: string
  clientId: string
  clientName: string
  saleId?: string
  amount: number
  date: string
  note?: string
  salesSnapshot?: Sale[]
  createdAt?: number
  updatedAt?: number
  updatedBy?: string
  deviceId?: string
}

export type PriceSettings = {
  standard: number
  custom: number
}

export type PaymentStatus = 'PRAZO' | 'AVISTA'

export const DEFAULT_SETTINGS: PriceSettings = {
  standard: 3.0,
  custom: 3.5
}

export type ViewState = 'LIST' | 'DETAILS'
export type TabState =
  | 'CLIENTS'
  | 'PAYMENTS'
  | 'REPORTS'
  | 'REPRODUCTION'
  | 'SETTINGS'

export type Cow = {
  id: string
  name: string
  createdAt?: number
  updatedAt?: number
  updatedBy?: string
  deviceId?: string
}

export type CalvingSex = 'MACHO' | 'FEMEA'

export type CalvingEvent = {
  id: string
  cowId: string
  /** ISO string */
  date: string
  sex: CalvingSex
  /** data URL (ex.: data:image/jpeg;base64,...) */
  photoDataUrl?: string | null
  createdAt?: number
  updatedAt?: number
  updatedBy?: string
  deviceId?: string
}

export type FormErrors = {
  [key: string]: string
}
