import { useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import MonthSelect from '../components/MonthSelect'
import { useApi } from '../useApi'
import { downloadAuth } from '../api'
import { formatMoney, formatDate, formatMonth, currentMonth } from '../format'
import type { Transaction } from '../types'

export default function Export() {
  const [month, setMonth] = useState(currentMonth())
  const params = month === 'all' ? '' : `?month=${month}`
  const { data, error } = useApi<Transaction[]>(`/api/transactions${params}`)
  const transactions = data ?? []

  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const title = month === 'all' ? 'Toutes les transactions' : `Transactions · ${formatMonth(month)}`

  function exportPdf() {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    doc.setFontSize(16)
    doc.text('Rapport de budget', 40, 45)
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(title, 40, 65)
    doc.text(`Généré le ${formatDate(new Date().toISOString().slice(0, 10))}`, 40, 81)

    autoTable(doc, {
      startY: 100,
      head: [['Date', 'Type', 'Libellé', 'Catégorie', 'Compte', 'Montant']],
      body: transactions.map((t) => [
        formatDate(t.date),
        t.type === 'income' ? 'Revenu' : 'Dépense',
        t.label,
        t.category_name ?? 'Sans catégorie',
        t.account_name ?? '',
        `${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}`,
      ]),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [37, 99, 235] },
      alternateRowStyles: { fillColor: [243, 244, 246] },
      margin: { left: 40, right: 40 },
    })

    const last = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
    const y = (last?.finalY ?? 100) + 25
    doc.setFontSize(11)
    doc.setTextColor(0)
    doc.text(`Revenus : ${formatMoney(income)}`, 40, y)
    doc.text(`Dépenses : ${formatMoney(expense)}`, 40, y + 16)
    doc.text(`Épargne : ${formatMoney(income - expense, true)}`, 40, y + 32)

    doc.save(`budget-${month === 'all' ? 'tout' : month}.pdf`)
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Export</h1>
        <MonthSelect value={month} onChange={setMonth} />
      </div>

      {error && <p className="error-box">{error}</p>}

      <div className="card export-card">
        <h2>{title}</h2>
        <p className="muted">
          {transactions.length} transactions · Revenus {formatMoney(income)} · Dépenses {formatMoney(expense)} · Épargne{' '}
          {formatMoney(income - expense, true)}
        </p>
        <div className="header-actions">
          <button
            className="btn primary"
            onClick={() =>
              downloadAuth(`/api/export/csv${params}`, `transactions-${month === 'all' ? 'tout' : month}.csv`).catch(
                (e) => window.alert(e instanceof Error ? e.message : 'Erreur')
              )
            }
          >
            Télécharger CSV
          </button>
          <button className="btn ghost" onClick={exportPdf}>
            Télécharger PDF
          </button>
        </div>
        <p className="muted small">
          Le CSV utilise le séparateur « ; » et les décimales à la virgelle, compatible avec Excel et LibreOffice.
        </p>
      </div>
    </div>
  )
}
