export function formatTimeSince(
  dateInput: Date | string,
  now = new Date()
): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return 'hoje'

  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffDays <= 0) return 'hoje'

  const plural = (n: number, singular: string, pluralForm: string) =>
    n === 1 ? singular : pluralForm

  if (diffDays < 30) {
    return `há ${diffDays} ${plural(diffDays, 'dia', 'dias')}`
  }

  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    const days = diffDays % 30
    const mPart = `${months} ${plural(months, 'mês', 'meses')}`
    const dPart = days > 0 ? ` e ${days} ${plural(days, 'dia', 'dias')}` : ''
    return `há ${mPart}${dPart}`
  }

  const years = Math.floor(diffDays / 365)
  const remainingDays = diffDays % 365
  const months = Math.floor(remainingDays / 30)
  const yPart = `${years} ${plural(years, 'ano', 'anos')}`
  const mPart = months > 0 ? ` e ${months} ${plural(months, 'mês', 'meses')}` : ''
  return `há ${yPart}${mPart}`
}
