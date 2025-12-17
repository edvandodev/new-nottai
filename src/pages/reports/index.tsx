import React, { useMemo, useState } from 'react'
import type { Payment, Sale } from '@/types'
import { BarChart3, Calendar, DollarSign, Droplets } from 'lucide-react'

interface ReportsPageProps {
  sales: Sale[]
  payments: Payment[]
}

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
]

export function ReportsPage({ sales, payments }: ReportsPageProps) {
  const [reportYear, setReportYear] = useState(new Date().getFullYear())
  const [reportMonth, setReportMonth] = useState(new Date().getMonth())

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const availableYears = useMemo(() => {
    const years = new Set<number>()
    years.add(new Date().getFullYear())

    sales.forEach((s) => years.add(new Date(s.date).getFullYear()))
    payments.forEach((p) => {
      if (p.salesSnapshot) {
        p.salesSnapshot.forEach((s: Sale) =>
          years.add(new Date(s.date).getFullYear())
        )
      }
    })

    return Array.from(years).sort((a, b) => b - a)
  }, [sales, payments])

  const reportData = useMemo(() => {
    const allSales: Sale[] = [
      ...sales,
      ...payments.flatMap((p) =>
        p.salesSnapshot ? (p.salesSnapshot as Sale[]) : []
      )
    ]

    const filtered = allSales.filter((s) => {
      const d = new Date(`${s.date}T12:00:00`)
      return d.getFullYear() === reportYear && d.getMonth() === reportMonth
    })

    const totalLiters = filtered.reduce((acc, cur) => acc + cur.liters, 0)
    const totalValue = filtered.reduce((acc, cur) => acc + cur.totalValue, 0)

    const weeks: Record<
      number,
      { liters: number; value: number; label: string }
    > = {}
    filtered.forEach((s) => {
      const d = new Date(`${s.date}T12:00:00`)
      const weekNum = Math.ceil(d.getDate() / 7)
      if (!weeks[weekNum])
        weeks[weekNum] = { liters: 0, value: 0, label: `Semana ${weekNum}` }
      weeks[weekNum].liters += s.liters
      weeks[weekNum].value += s.totalValue
    })

    return {
      totalLiters,
      totalValue,
      weeks: Object.values(weeks).sort((a, b) => a.label.localeCompare(b.label))
    }
  }, [sales, payments, reportYear, reportMonth])

  return (
    <div className='space-y-6 animate-fade-in'>
      <div className='bg-slate-800 rounded-2xl p-4 border border-slate-700'>
        <div className='flex items-center gap-2 text-slate-400 mb-3 uppercase text-xs font-bold tracking-wider'>
          <Calendar size={14} />
          Filtro de Período
        </div>
        <div className='flex gap-3'>
          <div className='flex-1'>
            <select
              value={reportMonth}
              onChange={(e) => setReportMonth(Number(e.target.value))}
              className='w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none'
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className='flex-1'>
            <select
              value={reportYear}
              onChange={(e) => setReportYear(Number(e.target.value))}
              className='w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none'
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <div className='bg-blue-900/20 border border-blue-500/30 rounded-2xl p-4 flex flex-col justify-between h-32'>
          <div className='flex justify-between items-start'>
            <span className='text-blue-300 font-medium text-sm'>
              Total Litros
            </span>
            <Droplets size={18} className='text-blue-400' />
          </div>
          <span className='text-3xl font-bold text-blue-100'>
            {reportData.totalLiters} L
          </span>
        </div>

        <div className='bg-green-900/20 border border-green-500/30 rounded-2xl p-4 flex flex-col justify-between h-32'>
          <div className='flex justify-between items-start'>
            <span className='text-green-300 font-medium text-sm'>
              Valor Total
            </span>
            <DollarSign size={18} className='text-green-400' />
          </div>
          <span className='text-3xl font-bold text-green-100'>
            {formatCurrency(reportData.totalValue)}
          </span>
        </div>
      </div>

      <div>
        <div className='flex items-center gap-2 mb-3'>
          <BarChart3 size={18} className='text-slate-500' />
          <h3 className='text-slate-400 text-sm font-bold uppercase tracking-wider'>
            Desempenho por Semana
          </h3>
        </div>

        {reportData.weeks.length === 0 ? (
          <div className='bg-slate-900/50 rounded-xl p-8 text-center border border-slate-800 border-dashed'>
            <p className='text-slate-500'>
              Nenhuma venda registrada neste período.
            </p>
          </div>
        ) : (
          <div className='space-y-3'>
            {reportData.weeks.map((week, idx) => (
              <div
                key={idx}
                className='bg-slate-800 rounded-xl p-4 border border-slate-700 flex justify-between items-center'
              >
                <div className='flex flex-col'>
                  <span className='text-white font-bold'>{week.label}</span>
                  <span className='text-slate-500 text-xs mt-0.5'>
                    {week.liters}{' '}
                    {week.liters === 1 ? 'Litro vendido' : 'Litros vendidos'}
                  </span>
                </div>
                <div className='px-3 py-1 bg-slate-900 rounded-lg border border-slate-700'>
                  <span className='text-green-400 font-bold'>
                    {formatCurrency(week.value)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
