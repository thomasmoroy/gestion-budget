import { useState } from 'react'
import Modal from './Modal'
import { api } from '../api'
import type { Account, Category, Transaction, TxType } from '../types'

interface Props {
  transaction: Transaction | null
  accounts: Account[]
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function TransactionModal({ transaction, accounts, categories, onClose, onSaved }: Props) {
  const [type, setType] = useState<TxType>(transaction?.type ?? 'expense')
  const [amount, setAmount] = useState(transaction ? (transaction.amount / 100).toFixed(2) : '')
  const [date, setDate] = useState(transaction?.date ?? today())
  const [label, setLabel] = useState(transaction?.label ?? '')
  const [note, setNote] = useState(transaction?.note ?? '')
  const [accountId, setAccountId] = useState(transaction?.account_id ?? accounts[0]?.id ?? 1)
  const [categoryId, setCategoryId] = useState<number | ''>(transaction?.category_id ?? '')
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
    setSaving(true)
    const payload = {
      account_id: Number(accountId),
      category_id: categoryId === '' ? null : Number(categoryId),
      type,
      amount: cents,
      date,
      label: label.trim(),
      note: note.trim() || null,
    }
    try {
      if (transaction) await api.put(`/api/transactions/${transaction.id}`, payload)
      else await api.post('/api/transactions', payload)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={transaction ? 'Modifier la transaction' : 'Nouvelle transaction'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <div className="segmented">
          <button
            type="button"
            className={type === 'expense' ? 'active expense' : ''}
            onClick={() => changeType('expense')}
          >
            Dépense
          </button>
          <button
            type="button"
            className={type === 'income' ? 'active income' : ''}
            onClick={() => changeType('income')}
          >
            Revenu
          </button>
        </div>

        <div className="form-row">
          <label>
            Montant (€)
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              autoFocus
            />
          </label>
          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>

        <label>
          Libellé
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. Courses" />
        </label>

        <div className="form-row">
          <label>
            Compte
            <select value={accountId} onChange={(e) => setAccountId(Number(e.target.value))}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Catégorie
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">— Aucune —</option>
              {visibleCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Note
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optionnel" />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
