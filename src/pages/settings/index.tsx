import React, { useEffect, useState } from 'react'
import { DollarSign, Tag } from 'lucide-react'
import type { PriceSettings } from '@/types'

type SettingsPageProps = {
  priceSettings: PriceSettings
  onSavePriceSettings: (next: PriceSettings) => void | Promise<void>
  versionLabel?: string
}

export function SettingsPage({
  priceSettings,
  onSavePriceSettings,
  versionLabel = 'Nottai'
}: SettingsPageProps) {
  const [standardPriceInput, setStandardPriceInput] = useState('0')
  const [customPriceInput, setCustomPriceInput] = useState('0')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setStandardPriceInput(String(priceSettings?.standard ?? 0))
    setCustomPriceInput(String(priceSettings?.custom ?? 0))
  }, [priceSettings])

  const parsePrice = (v: string) => {
    const n = Number(String(v).replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }

  const handleSave = async () => {
    const next: PriceSettings = {
      standard: parsePrice(standardPriceInput),
      custom: parsePrice(customPriceInput)
    }

    try {
      setIsSaving(true)
      await onSavePriceSettings(next)
      alert('Precos atualizados com sucesso!')
    } catch (error) {
      console.error('Falha ao salvar precos', error)
      alert('Nao foi possivel salvar os precos. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className='space-y-6 animate-fade-in'>
      <div className='bg-slate-800 rounded-xl p-6 border border-slate-700'>
        <div className='flex items-center gap-3 mb-6'>
          <div className='p-2 bg-blue-600/20 rounded-lg text-blue-400'>
            <DollarSign size={24} />
          </div>
          <div>
            <h2 className='text-lg font-bold text-white'>
              Configuração de Preços
            </h2>
            <p className='text-slate-400 text-sm'>
              Defina os valores das tabelas
            </p>
          </div>
        </div>

        <div className='space-y-5'>
          <div className='p-4 bg-slate-900/50 rounded-xl border border-slate-700/50'>
            <label className='block text-sm font-medium text-blue-400 mb-2'>
              Preço Padrão (R$)
            </label>
            <input
              type='number'
              step='0.01'
              className='w-full p-4 bg-slate-800 border border-slate-600 rounded-lg text-white text-xl font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none'
              value={standardPriceInput}
              onChange={(e) => setStandardPriceInput(e.target.value)}
            />
            <p className='text-xs text-slate-500 mt-2'>
              Usado pela maioria dos clientes.
            </p>
          </div>

          <div className='p-4 bg-slate-900/50 rounded-xl border border-slate-700/50'>
            <div className='flex items-center gap-2 mb-2'>
              <Tag size={16} className='text-purple-400' />
              <label className='block text-sm font-medium text-purple-400'>
                Preço Personalizado (R$)
              </label>
            </div>
            <input
              type='number'
              step='0.01'
              className='w-full p-4 bg-slate-800 border border-slate-600 rounded-lg text-white text-xl font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none'
              value={customPriceInput}
              onChange={(e) => setCustomPriceInput(e.target.value)}
            />
            <p className='text-xs text-slate-500 mt-2'>
              Valor alternativo selecionável no cadastro do cliente.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className='w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-blue-900/40 mt-2 active:scale-[0.99]'
          >
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      <div className='text-center p-4'>
        <p className='text-slate-600 text-sm'>{versionLabel}</p>
      </div>
    </div>
  )
}
