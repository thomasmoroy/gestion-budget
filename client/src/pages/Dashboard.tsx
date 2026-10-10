import { useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts'
import MonthSelect from '../components/MonthSelect'
import { useApi } from '../useApi'
import { formatMoney, formatMonth, monthShort, currentMonth } from '../format'
import type { Summary } from '../types'

export default function Dashboard() {
  const [month, setMonth] = useState(currentMonth())
  const { data, error, loading } = useApi<Summary>(`/api/dashboard/summary?month=${month}`)

  if (error) return <p className="error-box">{error}</p>
  if (loading || !data) return <p className="muted">Chargement…</p>

  const totalBalance = data.accounts.reduce((s, a) => s + a.balance, 0)
  const savingsRate = data.income > 0 ? Math.round((data.net / data.income) * 100) : 0

  const cards = [
    { label: 'Solde total', value: formatMoney(totalBalance), className: '' },
    { label: `Revenus · ${formatMonth(month)}`, value: formatMoney(data.income), className: 'positive' },
    { label: `Dépenses · ${formatMonth(month)}`, value: formatMoney(data.expense), className: 'negative' },
    { label: 'Épargne du mois', value: formatMoney(data.net, true), className: data.net >= 0 ? 'positive' : 'negative' },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <h1>Tableau de bord</h1>
        <MonthSelect value={month} onChange={setMonth} />
      </div>

      <div className="cards">
        {cards.map((c) => (
          <div className="card stat" key={c.label}>
            <span className="stat-label">{c.label}</span>
            <span className={`stat-value ${c.className}`}>{c.value}</span>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <section className="card">
          <h2>Dépenses par catégorie</h2>
          {data.byCategory.length === 0 ? (
            <p className="muted">Aucune dépense ce mois-ci.</p>
          ) : (
            <div className="chart-lg">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={data.byCategory} dataKey="total" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                    {data.byCategory.map((c) => (
                      <Cell key={c.name} fill={c.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatMoney(Number(v))} />
                  <Legend formatter={(v: string) => <span style={{ fontSize: 12 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="card">
          <h2>Évolution sur 6 mois</h2>
          <div className="chart-lg">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.evolution} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickFormatter={monthShort} fontSize={12} />
                <YAxis tickFormatter={(v: number) => `${v / 100} €`} fontSize={12} />
                <Tooltip formatter={(v) => formatMoney(Number(v))} />
                <Legend />
                <Bar dataKey="income" name="Revenus" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <h2>Budgets du mois</h2>
          {data.budgets.length === 0 ? (
            <p className="muted">Aucun budget défini pour ce mois.</p>
          ) : (
            <ul className="budget-list">
              {data.budgets.map((b) => (
                <li key={b.category_id}>
                  <div className="budget-row">
                    <span className="budget-name">
                      <span className="dot" style={{ background: b.color }} /> {b.name}
                    </span>
                    <span className={`budget-amount ${b.remaining < 0 ? 'negative' : ''}`}>
                      {formatMoney(b.spent)} / {formatMoney(b.budget)}
                    </span>
                  </div>
                  <div className="progress">
                    <div
                      className={`progress-fill ${b.ratio > 1 ? 'over' : b.ratio > 0.8 ? 'warn' : ''}`}
                      style={{ width: `${Math.min(100, b.ratio * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2>Comptes</h2>
          <ul className="account-list">
            {data.accounts.map((a) => (
              <li key={a.id}>
                <span>{a.name}</span>
                <span className={a.balance >= 0 ? 'positive' : 'negative'}>{formatMoney(a.balance)}</span>
              </li>
            ))}
          </ul>
          <p className="muted small">
            Taux d'épargne de {formatMonth(month)} : <strong>{savingsRate} %</strong>
          </p>
        </section>
      </div>
    </div>
  )
}
