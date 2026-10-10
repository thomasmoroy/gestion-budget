import { Router } from 'express';
import { q } from '../db.js';
import { badRequest, monthRange, parseMonth } from '../utils.js';

const router = Router();

function formatAmount(cents) {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function escapeCsv(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

router.get('/csv', async (req, res) => {
  const month = parseMonth(req.query.month, false);
  const clauses = ['t.user_id = $1'];
  const params = [req.userId];
  if (month) {
    const { start, end } = monthRange(month);
    clauses.push(`t.date >= $2 AND t.date <= $3`);
    params.push(start, end);
  }
  const rows = await q(
    `SELECT t.date, t.type, t.label, COALESCE(c.name, 'Sans catégorie') AS category,
            a.name AS account, t.amount, COALESCE(t.note, '') AS note
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     JOIN accounts a ON a.id = t.account_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY t.date DESC, t.id DESC`,
    params
  );

  const header = ['Date', 'Type', 'Libellé', 'Catégorie', 'Compte', 'Montant', 'Note'];
  const lines = [header.join(';')];
  for (const r of rows) {
    lines.push(
      [
        typeof r.date === 'string' ? r.date : r.date.toISOString().slice(0, 10),
        r.type === 'income' ? 'Revenu' : 'Dépense',
        r.label,
        r.category,
        r.account,
        formatAmount(r.amount),
        r.note,
      ]
        .map(escapeCsv)
        .join(';')
    );
  }
  const filename = `transactions-${month ?? 'tout'}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(`﻿${lines.join('\r\n')}`);
});

export default router;
