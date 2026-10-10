import { Router } from 'express';
import { q, q1, run } from '../db.js';
import { badRequest, today } from '../utils.js';

const router = Router();

async function accountWithBalance(row) {
  const sums = await q1(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
     FROM transactions WHERE account_id = $1 AND date <= $2`,
    [row.id, today()]
  );
  const balance = row.initial_balance + sums.income - sums.expense;
  return { ...row, balance, income: sums.income, expense: sums.expense };
}

router.get('/', async (req, res) => {
  const rows = await q('SELECT * FROM accounts WHERE user_id = $1 ORDER BY id', [req.userId]);
  res.json(await Promise.all(rows.map(accountWithBalance)));
});

router.get('/:id', async (req, res) => {
  const row = await q1('SELECT * FROM accounts WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  if (!row) return res.status(404).json({ error: 'Compte introuvable' });
  res.json(await accountWithBalance(row));
});

router.post('/', async (req, res) => {
  const { name, type = 'courant', currency = 'EUR', initial_balance = 0 } = req.body || {};
  if (!name || typeof name !== 'string') return badRequest(res, 'Le nom est requis');
  if (!['courant', 'epargne', 'cash'].includes(type)) return badRequest(res, 'Type de compte invalide');
  if (!Number.isInteger(initial_balance)) return badRequest(res, 'Solde initial invalide');
  const row = await q1(
    `INSERT INTO accounts (user_id, name, type, currency, initial_balance)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.userId, name.trim(), type, currency, initial_balance]
  );
  res.status(201).json(await accountWithBalance(row));
});

router.put('/:id', async (req, res) => {
  const existing = await q1('SELECT * FROM accounts WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  if (!existing) return res.status(404).json({ error: 'Compte introuvable' });
  const {
    name = existing.name,
    type = existing.type,
    currency = existing.currency,
    initial_balance = existing.initial_balance,
  } = req.body || {};
  if (!name || typeof name !== 'string') return badRequest(res, 'Le nom est requis');
  if (!['courant', 'epargne', 'cash'].includes(type)) return badRequest(res, 'Type de compte invalide');
  if (!Number.isInteger(initial_balance)) return badRequest(res, 'Solde initial invalide');
  const row = await q1(
    'UPDATE accounts SET name = $1, type = $2, currency = $3, initial_balance = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
    [name.trim(), type, currency, initial_balance, existing.id, req.userId]
  );
  res.json(await accountWithBalance(row));
});

router.delete('/:id', async (req, res) => {
  const result = await run('DELETE FROM accounts WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Compte introuvable' });
  res.status(204).end();
});

export default router;
