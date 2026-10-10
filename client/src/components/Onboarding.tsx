import { useState } from 'react'
import { api } from '../api'

interface Props {
  onDone: () => void
}

export default function Onboarding({ onDone }: Props) {
  const [balance, setBalance] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const value = parseFloat(balance.replace(',', '.'))
    if (balance.trim() === '' || Number.isNaN(value)) return setError('Montant invalide')
    setSaving(true)
    try {
      await api.post('/api/accounts', {
        name: 'Compte courant',
        type: 'courant',
        currency: 'EUR',
        initial_balance: Math.round(value * 100),
      })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
      setSaving(false)
    }
  }

  return (
    <div className="onboarding">
      <div className="onboarding-card card">
        <span className="brand-mark">€</span>
        <h1>Bienvenue dans votre gestion de budget</h1>
        <p className="muted">
          Commencez par indiquer votre <strong>solde d'aujourd'hui</strong>. Vous pourrez ensuite ajouter vos comptes,
          vos dépenses et revenus fixes, et suivre vos budgets.
        </p>
        <form onSubmit={submit} className="form">
          <label>
            Mon solde aujourd'hui (€)
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ex. 1250,00"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              autoFocus
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Création…' : 'Commencer'}
          </button>
        </form>
      </div>
    </div>
  )
}
