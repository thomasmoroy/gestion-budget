import { useState } from 'react'
import CategoryModal from '../components/CategoryModal'
import { useApi } from '../useApi'
import { api } from '../api'
import type { Category, Transaction } from '../types'

export default function Categories() {
  const { data, error, loading, reload } = useApi<Category[]>('/api/categories')
  const transactions = useApi<Transaction[]>('/api/transactions').data ?? []
  const [modal, setModal] = useState<{ open: boolean; category: Category | null }>({ open: false, category: null })
  const categories = data ?? []

  const usage = new Map<number, number>()
  for (const t of transactions) {
    if (t.category_id) usage.set(t.category_id, (usage.get(t.category_id) ?? 0) + 1)
  }

  async function remove(category: Category) {
    const count = usage.get(category.id) ?? 0
    const msg =
      count > 0
        ? `Supprimer « ${category.name} » ? Les ${count} transactions associées seront conservées sans catégorie.`
        : `Supprimer « ${category.name} » ?`
    if (!window.confirm(msg)) return
    try {
      await api.del(`/api/categories/${category.id}`)
      reload()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur')
    }
  }

  function renderList(list: Category[]) {
    return (
      <ul className="category-list">
        {list.map((c) => (
          <li key={c.id}>
            <span className="chip" style={{ borderColor: c.color }}>
              <span className="dot" style={{ background: c.color }} />
              {c.name}
            </span>
            <span className="category-meta">
              <span className="muted small">{usage.get(c.id) ?? 0} transactions</span>
              <button className="icon-btn" title="Modifier" onClick={() => setModal({ open: true, category: c })}>
                ✎
              </button>
              <button className="icon-btn danger" title="Supprimer" onClick={() => remove(c)}>
                🗑
              </button>
            </span>
          </li>
        ))}
        {list.length === 0 && <li className="muted">Aucune catégorie.</li>}
      </ul>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Catégories</h1>
        <button className="btn primary" onClick={() => setModal({ open: true, category: null })}>
          + Nouvelle catégorie
        </button>
      </div>

      {error && <p className="error-box">{error}</p>}
      {loading && <p className="muted">Chargement…</p>}

      <div className="grid-2">
        <section className="card">
          <h2>Dépenses</h2>
          {renderList(categories.filter((c) => c.type === 'expense'))}
        </section>
        <section className="card">
          <h2>Revenus</h2>
          {renderList(categories.filter((c) => c.type === 'income'))}
        </section>
      </div>

      {modal.open && (
        <CategoryModal
          category={modal.category}
          onClose={() => setModal({ open: false, category: null })}
          onSaved={reload}
        />
      )}
    </div>
  )
}
