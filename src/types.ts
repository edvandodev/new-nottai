export type PriceType = 'STANDARD' | 'CUSTOM'

export interface Client {
  id: string
  name: string
  phone: string
  priceType: PriceType
  avatar?: string
}

export interface Sale {
  id: string
  clientId: string
  date: string
  liters: number
  totalValue: number
}

export interface Payment {
  id: string
  clientId: string
  clientName: string
  date: string
  amount: number
  salesSnapshot?: Sale[]
}

export interface PriceSettings {
  standard: number
  custom: number
}

export const DEFAULT_SETTINGS: PriceSettings = {
  standard: 3.0,
  custom: 3.5
}

export type ViewState = 'LIST' | 'DETAILS'
export type TabState = 'CLIENTS' | 'PAYMENTS' | 'REPORTS' | 'SETTINGS'

export interface FormErrors {
  [key: string]: string
}
