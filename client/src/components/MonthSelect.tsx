import { monthOptions } from '../format'

interface Props {
  value: string
  onChange: (month: string) => void
  months?: number
}

export default function MonthSelect({ value, onChange, months = 24 }: Props) {
  return (
    <select className="month-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {monthOptions(months).map((m) => (
        <option key={m.value} value={m.value}>
          {m.label}
        </option>
      ))}
    </select>
  )
}
