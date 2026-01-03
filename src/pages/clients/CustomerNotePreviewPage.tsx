import React, { useMemo, useState } from 'react'
import { X, FileText, Clock3, CheckCircle, AlertTriangle } from 'lucide-react'
import type { Client, Payment, Sale } from '@/types'
import type { ReceiptFileRef } from '@/services/pdfGenerator'
import {
  computeNoteData,
  generateCustomerNotePdf,
  resolvePeriodRange,
  type PeriodPreset
} from '@/services/customerNote'
import '../../styles/theme-flat.css'

type CustomerNotePreviewPageProps = {
  clientId: string
  clients: Client[]
  sales: Sale[]
  payments: Payment[]
  onClose: () => void
  onPdfReady: (payload: {
    file: ReceiptFileRef
    clientName: string
    periodLabel: string
    balance: number
  }) => void
}

const presets: { label: string; value: PeriodPreset }[] = [
  { label: 'Tudo', value: 'all' },
  { label: 'Hoje', value: 'today' },
  { label: 'Últimos 7 dias', value: '7d' },
  { label: 'Últimos 30 dias', value: '30d' },
  { label: 'Este mês', value: 'month' }
]

const getInitials = (name: string) => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

const getAvatarColors = (input: string) => {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  return {
    bg: `hsl(${hue}, 35%, 22%)`,
    text: `hsl(${hue}, 70%, 80%)`
  }
}

const formatCurrency = (val: number) =>
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const formatDateTimeShort = (value: number | string | Date) => {
  const d = new Date(value)
  const date = d.toLocaleDateString('pt-BR')
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

export const CustomerNotePreviewPage: React.FC<CustomerNotePreviewPageProps> = ({
  clientId,
  clients,
  sales,
  payments,
  onClose,
  onPdfReady
}) => {
  const client = clients.find((c) => c.id === clientId)
  const [preset, setPreset] = useState<PeriodPreset>('all')
  const [includeDetails, setIncludeDetails] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const nowTs = useMemo(() => Date.now(), [])

  const [start, end] = useMemo(
    () => resolvePeriodRange(preset, nowTs),
    [preset, nowTs]
  )

  const noteData = useMemo(
    () =>
      computeNoteData(
        sales.filter((s) => s.clientId === clientId),
        payments.filter((p) => p.clientId === clientId),
        start,
        end
      ),
    [sales, payments, clientId, start, end]
  )

  if (!client) {
    return (
      <div
        data-theme='flat-lime'
        className='fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4'
      >
        <div className='flat-card w-full max-w-md p-6 space-y-3 text-center'>
          <p className='text-lg font-semibold'>Cliente não encontrado</p>
          <p className='text-sm' style={{ color: 'var(--muted)' }}>
            Volte e selecione um cliente válido para gerar a nota.
          </p>
          <button
            onClick={onClose}
            className='mt-2 px-4 py-2 rounded-xl font-semibold'
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-ink)',
              border: '1px solid var(--accent)'
            }}
          >
            Voltar
          </button>
        </div>
      </div>
    )
  }

  const periodLabel =
    presets.find((p) => p.value === preset)?.label || 'Tudo'

  const statusLabel =
    noteData.balance > 0
      ? 'DEVENDO'
      : noteData.balance < 0
        ? 'CRÉDITO'
        : noteData.totalSales + noteData.totalPaid === 0
          ? 'SEM MOVIMENTAÇÕES'
          : 'EM DIA'

  const statusColor =
    noteData.balance > 0
      ? 'var(--danger, #ff5a6a)'
      : noteData.balance < 0
        ? 'var(--accent)'
        : 'var(--accent)'

  const handleGenerate = async () => {
    try {
      setIsGenerating(true)
      const file = await generateCustomerNotePdf(client, noteData, {
        periodLabel,
        includeDetails,
        emittedAt: new Date(nowTs)
      })
      onPdfReady({ file, clientName: client.name, periodLabel, balance: noteData.balance })
    } catch (error) {
      console.error('Falha ao gerar nota do cliente', error)
      alert('Não foi possível gerar o PDF da nota.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div
      data-theme='flat-lime'
      className='fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xl overflow-y-auto'
    >
      <div
        className='max-w-xl mx-auto min-h-screen pb-24'
        style={{ background: 'linear-gradient(180deg, rgba(12,16,23,0.96), rgba(10,12,18,0.92))' }}
      >
        <header
          className='sticky top-0 z-50 backdrop-blur-xl'
          style={{
            background: 'rgba(11, 15, 20, 0.7)',
            borderBottom: '1px solid var(--border)'
          }}
        >
          <div className='px-4 pt-4 pb-3 flex items-center justify-between gap-3'>
            <button
              onClick={onClose}
              className='h-11 w-11 rounded-full flex items-center justify-center border shadow-sm active:scale-95'
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              aria-label='Fechar'
            >
              <X size={18} />
            </button>
            <div className='text-center flex-1 min-w-0'>
              <p className='text-xs font-semibold uppercase tracking-wide' style={{ color: 'var(--muted)' }}>
                Prévia da Nota
              </p>
            </div>
            <div className='flex items-center gap-2 text-xs font-semibold' style={{ color: 'var(--muted)' }}>
              <Clock3 size={14} />
              {formatDateTimeShort(nowTs)}
            </div>
          </div>
        </header>

        <div className='px-4 py-4 space-y-4'>
          <div className='flat-card p-4 flex items-center gap-3'>
            <div
              className='h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold border'
              style={{
                backgroundColor: getAvatarColors(client.name).bg,
                color: getAvatarColors(client.name).text,
                borderColor: 'var(--border)'
              }}
            >
              {getInitials(client.name)}
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-base font-semibold truncate'>{client.name}</p>
              {client.phone ? (
                <p className='text-xs truncate' style={{ color: 'var(--muted)' }}>
                  {client.phone}
                </p>
              ) : null}
            </div>
            <div className='px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border'
              style={{ color: statusColor, borderColor: statusColor + '55', background: 'rgba(183, 246, 10, 0.08)' }}
            >
              {statusLabel}
            </div>
          </div>

          <div className='flat-card p-3'>
            <div className='flex gap-2 overflow-x-auto no-scrollbar'>
              {presets.map((p) => {
                const isActive = preset === p.value
                return (
                  <button
                    key={p.value}
                    type='button'
                    onClick={() => setPreset(p.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 flat-chip ${
                      isActive ? 'is-active' : ''
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div className='flat-card p-3 space-y-2'>
              <p className='text-xs font-semibold uppercase tracking-wide' style={{ color: 'var(--muted)' }}>
                Total de Vendas
              </p>
              <p className='text-2xl font-bold'>{formatCurrency(noteData.totalSales)}</p>
            </div>
            <div className='flat-card p-3 space-y-2'>
              <p className='text-xs font-semibold uppercase tracking-wide' style={{ color: 'var(--muted)' }}>
                Total Pago
              </p>
              <p className='text-2xl font-bold' style={{ color: 'var(--accent)' }}>
                {formatCurrency(noteData.totalPaid)}
              </p>
            </div>
          </div>

          <div
            className='flat-card p-4 relative overflow-hidden'
            style={{ background: 'linear-gradient(135deg, rgba(184,255,44,0.12), var(--surface))' }}
          >
            <div
              className='absolute -top-6 -right-10 w-32 h-32 rounded-full blur-3xl'
              style={{ background: 'rgba(184, 255, 44, 0.18)' }}
            />
            <div className='flex items-start justify-between gap-3 relative z-10'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-wide' style={{ color: 'var(--muted)' }}>
                  Saldo Atual
                </p>
                <p className='text-3xl font-bold leading-tight'>
                  {formatCurrency(noteData.balance)}
                </p>
                <div className='mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border'
                  style={{ color: statusColor, borderColor: statusColor + '55', background: 'rgba(183, 246, 10, 0.06)' }}
                >
                  {noteData.balance > 0 ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                  {statusLabel}
                </div>
              </div>
              {noteData.totalLiters ? (
                <div className='text-right'>
                  <span className='text-xs font-semibold uppercase tracking-wide' style={{ color: 'var(--muted)' }}>
                    Litros
                  </span>
                  <p className='text-xl font-bold'>{noteData.totalLiters.toFixed(2)} L</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className='flat-card p-4 flex items-center justify-between'>
            <div>
              <p className='text-sm font-semibold'>Incluir detalhamento</p>
              <p className='text-xs' style={{ color: 'var(--muted)' }}>
                Listas de vendas e pagamentos
              </p>
            </div>
            <button
              type='button'
              onClick={() => setIncludeDetails((v) => !v)}
              className={`w-12 h-7 rounded-full p-1 transition-all ${includeDetails ? 'bg-lime-400' : 'bg-slate-700'}`}
              aria-pressed={includeDetails}
            >
              <div
                className={`h-5 w-5 rounded-full bg-slate-900 shadow-sm transition-transform ${
                  includeDetails ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>

          <p className='text-xs text-center' style={{ color: 'var(--muted)' }}>
            Confira o resumo antes de gerar.
          </p>
        </div>

        <div
          className='fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-3'
          style={{
            background: 'linear-gradient(180deg, transparent, rgba(9, 12, 18, 0.95))'
          }}
        >
          <div className='max-w-xl mx-auto flex gap-3'>
            <button
              type='button'
              onClick={onClose}
              className='flex-1 h-12 rounded-xl font-semibold border shadow-sm active:scale-95'
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
              disabled={isGenerating}
            >
              Cancelar
            </button>
            <button
              type='button'
              onClick={handleGenerate}
              disabled={isGenerating}
              className='flex-1 h-12 rounded-xl font-semibold shadow-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60'
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-ink)',
                border: '1px solid var(--accent)'
              }}
            >
              {isGenerating ? (
                <span className='flex items-center gap-2'>
                  <span className='h-4 w-4 border-2 border-transparent border-t-slate-900 rounded-full animate-spin' />
                  Gerando PDF…
                </span>
              ) : (
                <>
                  <FileText size={16} />
                  Gerar PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

