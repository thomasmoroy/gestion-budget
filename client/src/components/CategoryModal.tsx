import { useState } from 'react'
import Modal from './Modal'
import { api } from '../api'
import type { Category, TxType } from '../types'

interface Props {
  category: Category | null
  onClose: () => void
  onSaved: () => void
}

export default function CategoryModal({ category, onClose, onSaved }: Props) {
  const [name, setName] = useState(category?.name ?? '')
  const [type, setType] = useState<TxType>(category?.type ?? 'expense')
  const [color, setColor] = useState(category?.color ?? '#3b82f6')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Le nom est requis')
    const payload = { name: name.trim(), type, color }
    setSaving(true)
    try {
      if (category) await api.put(`/api/categories/${category.id}`, payload)
      else await api.post('/api/categories', payload)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={category ? 'Modifier la catégorie' : 'Nouvelle catégorie'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>
          Nom
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Courses" autoFocus />
        </label>
        <label>
          Type
          <select value={type} onChange={(e) => setType(e.target.value as TxType)}>
            <option value="expense">Dépense</option>
            <option value="income">Revenu</option>
          </select>
        </label>
        <label>
          Couleur
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="color-input" />
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
