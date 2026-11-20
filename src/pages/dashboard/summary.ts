import type { Client, Payment, Sale } from '../../types'

export function dashboardSummary(
  sales: Sale[],
  payments: Payment[],
  clients: Client[],
  balances: Map<string, number>,
  now = new Date(),
) {
  const year = now.getFullYear(),
    month = now.getMonth()
  const inMonth = (value: string) => {
    const date = new Date(value)
    return date.getFullYear() === year && date.getMonth() === month
  }
  const monthSales = sales.filter((sale) => inMonth(sale.date))
  const monthPayments = payments.filter((payment) => inMonth(payment.date))
  const weekly = Array.from(
    { length: Math.ceil(new Date(year, month + 1, 0).getDate() / 7) },
    (_, index) => ({
      label: `${index * 7 + 1}–${Math.min((index + 1) * 7, new Date(year, month + 1, 0).getDate())}`,
      value: 0,
    }),
  )
  monthSales.forEach((sale) => {
    weekly[Math.floor((new Date(sale.date).getDate() - 1) / 7)].value +=
      sale.totalValue
  })
  const cash = monthSales
    .filter((sale) => sale.paymentStatus === 'AVISTA')
    .reduce((sum, sale) => sum + sale.totalValue, 0)
  const credit = monthSales
    .filter((sale) => sale.paymentStatus === 'PRAZO')
    .reduce((sum, sale) => sum + sale.totalValue, 0)
  return {
    total: monthSales.reduce((sum, sale) => sum + sale.totalValue, 0),
    liters: monthSales.reduce((sum, sale) => sum + sale.liters, 0),
    received: monthPayments.reduce((sum, payment) => sum + payment.amount, 0),
    outstanding: clients.reduce(
      (sum, client) => sum + Math.max(0, balances.get(client.id) || 0),
      0,
    ),
    pendingClients: clients.filter(
      (client) => (balances.get(client.id) || 0) > 0,
    ).length,
    cash,
    credit,
    weekly,
    recent: [...monthPayments]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4),
  }
}
