import { useState } from 'react'
import MonthSelect from '../components/MonthSelect'
import { useApi } from '../useApi'
import { api } from '../api'
import { formatMoney, currentMonth } from '../format'
import type { Budget, Category } from '../types'

export default function Budgets() {
  const [month, setMonth] = useState(currentMonth())
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState<number | null>(null)

  const budgets = useApi<Budget[]>(`/api/budgets?month=${month}`)
  const categories = useApi<Category[]>('/api/categories')

  const expenseCategories = (categories.data ?? []).filter((c) => c.type === 'expense')
  const byCategory = new Map((budgets.data ?? []).map((b) => [b.category_id, b]))

  async function save(categoryId: number, raw: string) {
    const amount = Math.round(parseFloat(raw.replace(',', '.')) * 100)
    if (raw.trim() !== '' && (Number.isNaN(amount) || amount < 0)) {
      setError('Montant invalide')
      return
    }
    setError('')
    setSavingId(categoryId)
    try {
      await api.put('/api/budgets', { category_id: categoryId, month, amount: amount || 0 })
      budgets.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSavingId(null)
    }
  }

  const totalBudget = (budgets.data ?? []).reduce((s, b) => s + b.amount, 0)
  const totalSpent = (budgets.data ?? []).reduce((s, b) => s + b.spent, 0)

  return (
    <div className="page">
      <div className="page-header">
        <h1>Budgets mensuels</h1>
        <MonthSelect value={month} onChange={setMonth} />
      </div>

      {error && <p className="error-box">{error}</p>}

      <div className="cards">
        <div className="card stat">
          <span className="stat-label">Total alloué</span>
          <span className="stat-value">{formatMoney(totalBudget)}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Total dépensé</span>
          <span className={`stat-value ${totalSpent > totalBudget ? 'negative' : ''}`}>{formatMoney(totalSpent)}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Reste</span>
          <span className={`stat-value ${totalBudget - totalSpent < 0 ? 'negative' : 'positive'}`}>
            {formatMoney(totalBudget - totalSpent, true)}
          </span>
        </div>
      </div>

      <div className="card">
        <p className="muted small">Saisissez un plafond par catégorie de dépense. Laissez vide ou 0 pour supprimer un budget.</p>
        <ul className="budget-list detailed">
          {expenseCategories.map((c) => {
            const b = byCategory.get(c.id)
            const spent = b?.spent ?? 0
            const amount = b?.amount ?? 0
            const ratio = amount > 0 ? spent / amount : 0
            return (
              <li key={c.id}>
                <div className="budget-row">
                  <span className="budget-name">
                    <span className="dot" style={{ background: c.color }} /> {c.name}
                  </span>
                  <span className="budget-input">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      defaultValue={amount ? (amount / 100).toFixed(2) : ''}
                      key={`${c.id}-${amount}`}
                      disabled={savingId === c.id}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur()
                      }}
                      onBlur={(e) => {
                        const current = amount ? (amount / 100).toFixed(2) : ''
                        if (e.target.value !== current) save(c.id, e.target.value)
                      }}
                    />
                    <span className="euro">€</span>
                  </span>
                  <span className={`budget-amount ${spent > amount && amount > 0 ? 'negative' : ''}`}>
                    {formatMoney(spent)} dépensé
                    {amount > 0 && <> · reste {formatMoney(amount - spent)}</>}
                  </span>
                </div>
                {amount > 0 && (
                  <div className="progress">
                    <div
                      className={`progress-fill ${ratio > 1 ? 'over' : ratio > 0.8 ? 'warn' : ''}`}
                      style={{ width: `${Math.min(100, ratio * 100)}%` }}
                    />
                  </div>
                )}
              </li>
            )
          })}
          {expenseCategories.length === 0 && <li className="muted">Aucune catégorie de dépense.</li>}
        </ul>
      </div>
    </div>
  )
}
