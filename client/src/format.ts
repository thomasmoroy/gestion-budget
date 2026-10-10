const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
]

export function formatMoney(cents: number, withSign = false): string {
  const value = cents / 100
  const sign = withSign ? (value > 0 ? '+' : value < 0 ? '-' : '') : value < 0 ? '-' : ''
  return `${sign}${Math.abs(value).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

export function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthOptions(count = 24): { value: string; label: string }[] {
  const out = []
  const d = new Date()
  for (let i = 0; i < count; i++) {
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    out.push({ value, label: formatMonth(value) })
    d.setMonth(d.getMonth() - 1)
  }
  return out
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function monthShort(month: string): string {
  const m = Number(month.split('-')[1])
  return MONTHS[m - 1].slice(0, 3)
}
