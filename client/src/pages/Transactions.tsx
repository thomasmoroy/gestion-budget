import { useMemo, useState } from 'react'
import TransactionModal from '../components/TransactionModal'
import MonthSelect from '../components/MonthSelect'
import { useApi } from '../useApi'
import { api, downloadAuth } from '../api'
import { formatMoney, formatDate, currentMonth } from '../format'
import type { Account, Category, Transaction } from '../types'

export default function Transactions() {
  const [month, setMonth] = useState(currentMonth())
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<{ open: boolean; tx: Transaction | null }>({ open: false, tx: null })

  const accounts = useApi<Account[]>('/api/accounts').data ?? []
  const categories = useApi<Category[]>('/api/categories').data ?? []

  const params = new URLSearchParams()
  if (month !== 'all') params.set('month', month)
  if (accountId) params.set('account_id', accountId)
  if (categoryId) params.set('category_id', categoryId)
  if (type) params.set('type', type)
  if (search.trim()) params.set('search', search.trim())

  const { data, error, reload } = useApi<Transaction[]>(`/api/transactions?${params.toString()}`)
  const transactions = useMemo(() => data ?? [], [data])

  const totals = useMemo(() => {
    const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expense }
  }, [transactions])

  async function remove(tx: Transaction) {
    if (!window.confirm(`Supprimer « ${tx.label} » ?`)) return
    try {
      await api.del(`/api/transactions/${tx.id}`)
      reload()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Transactions</h1>
        <div className="header-actions">
          <button
            className="btn ghost"
            onClick={() =>
              downloadAuth(`/api/export/csv?${params.toString()}`, `transactions-${month === 'all' ? 'tout' : month}.csv`).catch(
                (e) => window.alert(e instanceof Error ? e.message : 'Erreur')
              )
            }
          >
            Export CSV
          </button>
          <button className="btn primary" onClick={() => setModal({ open: true, tx: null })}>
            + Nouvelle transaction
          </button>
        </div>
      </div>

      <div className="filters">
        <MonthSelect value={month} onChange={setMonth} />
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">Tous les comptes</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Tous les types</option>
          <option value="expense">Dépenses</option>
          <option value="income">Revenus</option>
        </select>
        <input
          type="search"
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="error-box">{error}</p>}

      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Libellé</th>
              <th>Catégorie</th>
              <th>Compte</th>
              <th className="right">Montant</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6} className="muted center">
                  Aucune transaction.
                </td>
              </tr>
            )}
            {transactions.map((t) => (
              <tr key={t.id}>
                <td className="nowrap">{formatDate(t.date)}</td>
                <td>
                  {t.label}{' '}
                  {t.fixed && <span className="chip fixed-chip">↻ fixe</span>}
                  {t.note && <span className="note"> — {t.note}</span>}
                </td>
                <td>
                  <span className="chip" style={{ borderColor: t.category_color ?? '#d1d5db' }}>
                    <span className="dot" style={{ background: t.category_color ?? '#9ca3af' }} />
                    {t.category_name ?? 'Sans catégorie'}
                  </span>
                </td>
                <td>{t.account_name}</td>
                <td className={`right nowrap ${t.type === 'income' ? 'positive' : 'negative'}`}>
                  {t.type === 'income' ? '+' : '−'}
                  {formatMoney(t.amount)}
                </td>
                <td className="right nowrap">
                  <button className="icon-btn" title="Modifier" onClick={() => setModal({ open: true, tx: t })}>
                    ✎
                  </button>
                  <button className="icon-btn danger" title="Supprimer" onClick={() => remove(t)}>
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>Total ({transactions.length} transactions)</td>
              <td className="right nowrap positive">+{formatMoney(totals.income)}</td>
              <td className="right nowrap negative">−{formatMoney(totals.expense)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {modal.open && (
        <TransactionModal
          transaction={modal.tx}
          accounts={accounts}
          categories={categories}
          onClose={() => setModal({ open: false, tx: null })}
          onSaved={reload}
        />
      )}
    </div>
  )
}
