import { useState } from 'react'
import AccountModal from '../components/AccountModal'
import { useApi } from '../useApi'
import { api } from '../api'
import { formatMoney } from '../format'
import type { Account } from '../types'

const TYPE_LABELS: Record<string, string> = {
  courant: 'Courant',
  epargne: 'Épargne',
  cash: 'Espèces',
}

export default function Accounts() {
  const { data, error, loading, reload } = useApi<Account[]>('/api/accounts')
  const [modal, setModal] = useState<{ open: boolean; account: Account | null }>({ open: false, account: null })
  const accounts = data ?? []

  async function remove(account: Account) {
    if (!window.confirm(`Supprimer le compte « ${account.name} » et toutes ses transactions ?`)) return
    try {
      await api.del(`/api/accounts/${account.id}`)
      reload()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur')
    }
  }

  const total = accounts.reduce((s, a) => s + (a.balance ?? 0), 0)

  return (
    <div className="page">
      <div className="page-header">
        <h1>Comptes</h1>
        <button className="btn primary" onClick={() => setModal({ open: true, account: null })}>
          + Nouveau compte
        </button>
      </div>

      {error && <p className="error-box">{error}</p>}
      {loading && <p className="muted">Chargement…</p>}

      <div className="cards accounts">
        {accounts.map((a) => (
          <div className="card account-card" key={a.id}>
            <div className="account-head">
              <span className="badge">{TYPE_LABELS[a.type] ?? a.type}</span>
              <span className="account-actions">
                <button className="icon-btn" title="Modifier" onClick={() => setModal({ open: true, account: a })}>
                  ✎
                </button>
                <button className="icon-btn danger" title="Supprimer" onClick={() => remove(a)}>
                  🗑
                </button>
              </span>
            </div>
            <h3>{a.name}</h3>
            <p className={`stat-value ${(a.balance ?? 0) >= 0 ? 'positive' : 'negative'}`}>
              {formatMoney(a.balance ?? 0)}
            </p>
            <p className="muted small">
              Initial : {formatMoney(a.initial_balance)} · Entrées {formatMoney(a.income ?? 0)} · Sorties{' '}
              {formatMoney(a.expense ?? 0)}
            </p>
          </div>
        ))}
      </div>

      <p className="muted">
        Patrimoine total : <strong>{formatMoney(total)}</strong>
      </p>

      {modal.open && (
        <AccountModal
          account={modal.account}
          onClose={() => setModal({ open: false, account: null })}
          onSaved={reload}
        />
      )}
    </div>
  )
}
