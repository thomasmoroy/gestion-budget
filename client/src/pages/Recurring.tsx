import { useState } from 'react'
import MonthSelect from '../components/MonthSelect'
import { useApi } from '../useApi'
import { api } from '../api'
import { formatMoney, currentMonth, formatDate } from '../format'
import type { Account, Category, Recurring, TxType } from '../types'

export default function RecurringPage() {
  const [month, setMonth] = useState(currentMonth())
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Recurring | null>(null)

  const recurring = useApi<Recurring[]>(`/api/recurring?month=${month}`)
  const accounts = useApi<Account[]>('/api/accounts').data ?? []
  const categories = useApi<Category[]>('/api/categories').data ?? []

  const items = recurring.data ?? []
  const activeItems = items.filter((r) => r.active)
  const totalIncome = activeItems.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0)
  const totalExpense = activeItems.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0)

  async function toggle(item: Recurring, active: boolean) {
    setError('')
    try {
      await api.put(`/api/recurring/${item.id}`, { active })
      recurring.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    }
  }

  async function remove(item: Recurring) {
    if (!window.confirm(`Supprimer « ${item.label} » ? Les transactions déjà générées restent en place.`)) return
    try {
      await api.del(`/api/recurring/${item.id}`)
      recurring.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dépenses & revenus fixes</h1>
        <div className="header-actions">
          <MonthSelect value={month} onChange={setMonth} />
          <button className="btn primary" onClick={() => { setEditing(null); setShowForm(true) }}>
            + Nouveau montant fixe
          </button>
        </div>
      </div>

      <div className="cards">
        <div className="card stat">
          <span className="stat-label">Revenus fixes actifs</span>
          <span className="stat-value positive">{formatMoney(totalIncome)}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Dépenses fixes actives</span>
          <span className="stat-value negative">{formatMoney(totalExpense)}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Reste chaque mois</span>
          <span className={`stat-value ${totalIncome - totalExpense >= 0 ? 'positive' : 'negative'}`}>
            {formatMoney(totalIncome - totalExpense, true)}
          </span>
        </div>
      </div>

      {error && <p className="error-box">{error}</p>}
      {recurring.error && <p className="error-box">{recurring.error}</p>}

      {showForm && (
        <RecurringForm
          editing={editing}
          accounts={accounts}
          categories={categories}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { setShowForm(false); setEditing(null); recurring.reload() }}
        />
      )}

      <div className="card">
        <p className="muted small">
          Cochez un montant pour l'inclure dans vos comptes du mois : la transaction correspondante est créée
          automatiquement. Décochez pour l'écarter.
        </p>
        <ul className="recurring-list">
          {items.map((r) => (
            <li key={r.id} className={r.active ? '' : 'inactive'}>
              <label className="recurring-check">
                <input
                  type="checkbox"
                  checked={r.active}
                  onChange={(e) => toggle(r, e.target.checked)}
                />
              </label>
              <div className="recurring-info">
                <span className="recurring-label">
                  {r.label}
                  <span className="chip fixed-chip">↻ fixe</span>
                  {r.tx_date && <span className="muted small">le {formatDate(r.tx_date)}</span>}
                </span>
                <span className="muted small">
                  {r.category_name ? `${r.category_name} · ` : ''}
                  {r.account_name ?? ''} · le {r.date_day} du mois
                </span>
              </div>
              <span className={`recurring-amount ${r.type === 'income' ? 'positive' : 'negative'}`}>
                {r.type === 'income' ? '+' : '−'}
                {formatMoney(r.amount)}
              </span>
              <span className="account-actions">
                <button
                  className="icon-btn"
                  title="Modifier"
                  onClick={() => { setEditing(r); setShowForm(true) }}
                >
                  ✎
                </button>
                <button className="icon-btn danger" title="Supprimer" onClick={() => remove(r)}>
                  🗑
                </button>
              </span>
            </li>
          ))}
          {items.length === 0 && (
            <li className="muted">Aucun montant fixe. Ajoutez par exemple votre loyer ou votre abonnement internet.</li>
          )}
        </ul>
      </div>
    </div>
  )
}

interface FormProps {
  editing: Recurring | null
  accounts: Account[]
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}

function RecurringForm({ editing, accounts, categories, onClose, onSaved }: FormProps) {
  const [type, setType] = useState<TxType>(editing?.type ?? 'expense')
  const [label, setLabel] = useState(editing?.label ?? '')
  const [amount, setAmount] = useState(editing ? (editing.amount / 100).toFixed(2) : '')
  const [day, setDay] = useState(editing?.date_day ?? 1)
  const [accountId, setAccountId] = useState(editing?.account_id ?? accounts[0]?.id ?? 1)
  const [categoryId, setCategoryId] = useState<number | ''>(editing?.category_id ?? '')
  const [active, setActive] = useState(editing?.active ?? true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const visibleCategories = categories.filter((c) => c.type === type)

  function changeType(next: TxType) {
    setType(next)
    const cat = categories.find((c) => c.id === Number(categoryId))
    if (cat && cat.type !== next) setCategoryId('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const cents = Math.round(parseFloat(amount.replace(',', '.')) * 100)
    if (!amount || Number.isNaN(cents) || cents <= 0) return setError('Montant invalide')
    if (!label.trim()) return setError('Le libellé est requis')
    const payload = {
      label: label.trim(),
      type,
      amount: cents,
      date_day: Number(day),
      category_id: categoryId === '' ? null : Number(categoryId),
      account_id: Number(accountId),
      active,
    }
    setSaving(true)
    try {
      if (editing) await api.put(`/api/recurring/${editing.id}`, payload)
      else await api.post('/api/recurring', payload)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
      setSaving(false)
    }
  }

  return (
    <div className="card form-card">
      <h2>{editing ? 'Modifier le montant fixe' : 'Nouveau montant fixe'}</h2>
      <form onSubmit={submit} className="form">
        <div className="segmented">
          <button type="button" className={type === 'expense' ? 'active expense' : ''} onClick={() => changeType('expense')}>
            Dépense fixe
          </button>
          <button type="button" className={type === 'income' ? 'active income' : ''} onClick={() => changeType('income')}>
            Revenu fixe
          </button>
        </div>

        <div className="form-row">
          <label>
            Libellé
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. Loyer" autoFocus />
          </label>
          <label>
            Montant (€)
            <input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
          </label>
        </div>

        <div className="form-row">
          <label>
            Compte
            <select value={accountId} onChange={(e) => setAccountId(Number(e.target.value))}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
          <label>
            Catégorie
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">— Aucune —</option>
              {visibleCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            Jour du mois
            <input
              type="number"
              min={1}
              max={31}
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
            />
          </label>
        </div>

        <label className="checkbox-label">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Actif (inclus dans les comptes)
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}
