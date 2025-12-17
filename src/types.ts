export type PriceType = 'STANDARD' | 'CUSTOM'

export type Client = {
  id: string
  name: string
  phone: string
  priceType: PriceType
  avatar?: string
}

export type Sale = {
  id: string
  clientId: string
  date: string
  liters: number
  totalValue: number
}

export type Payment = {
  id: string
  clientId: string
  clientName: string
  amount: number
  date: string
  salesSnapshot?: Sale[]
}

export type PriceSettings = {
  standard: number
  custom: number
}

export const DEFAULT_SETTINGS: PriceSettings = {
  standard: 3.0,
  custom: 3.5
}

export type ViewState = 'LIST' | 'DETAILS'
export type TabState = 'CLIENTS' | 'PAYMENTS' | 'REPORTS' | 'SETTINGS'

export type FormErrors = {
  [key: string]: string
}
