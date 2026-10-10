import { useState } from 'react'
import Modal from './Modal'
import { api } from '../api'
import type { Account, AccountType } from '../types'

interface Props {
  account: Account | null
  onClose: () => void
  onSaved: () => void
}

const TYPES: { value: AccountType; label: string }[] = [
  { value: 'courant', label: 'Compte courant' },
  { value: 'epargne', label: "Épargne" },
  { value: 'cash', label: 'Espèces' },
]

export default function AccountModal({ account, onClose, onSaved }: Props) {
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'courant')
  const [balance, setBalance] = useState(account ? (account.initial_balance / 100).toFixed(2) : '0,00')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Le nom est requis')
    const cents = Math.round(parseFloat(balance.replace(',', '.')) * 100)
    if (Number.isNaN(cents)) return setError('Solde initial invalide')
    const payload = { name: name.trim(), type, initial_balance: cents, currency: 'EUR' }
    setSaving(true)
    try {
      if (account) await api.put(`/api/accounts/${account.id}`, payload)
      else await api.post('/api/accounts', payload)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={account ? 'Modifier le compte' : 'Nouveau compte'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>
          Nom
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Compte courant" autoFocus />
        </label>
        <label>
          Type
          <select value={type} onChange={(e) => setType(e.target.value as AccountType)}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Solde initial (€)
          <input type="text" inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} />
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
