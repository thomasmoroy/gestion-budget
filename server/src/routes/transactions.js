import { Router } from 'express';
import { q, q1, run } from '../db.js';
import { badRequest, monthRange, parseMonth } from '../utils.js';

const router = Router();

const SELECT = `
  SELECT t.id, t.account_id, t.category_id, t.type, t.amount, t.date, t.label, t.note, t.recurring_id,
         c.name AS category_name, c.color AS category_color, a.name AS account_name,
         (t.recurring_id IS NOT NULL) AS fixed
  FROM transactions t
  LEFT JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
  JOIN accounts a ON a.id = t.account_id AND a.user_id = t.user_id
  WHERE t.user_id = $1
`;

async function validate(body, userId, existing = null) {
  const data = {
    account_id: body.account_id ?? existing?.account_id,
    category_id: body.category_id !== undefined ? body.category_id : existing?.category_id,
    type: body.type ?? existing?.type,
    amount: body.amount ?? existing?.amount,
    date: body.date ?? existing?.date,
    label: (body.label ?? existing?.label ?? '').trim(),
    note: body.note !== undefined ? body.note : existing?.note ?? null,
  };
  if (!['expense', 'income'].includes(data.type)) return { error: 'Type invalide' };
  if (!Number.isInteger(data.amount) || data.amount <= 0) return { error: 'Montant invalide (en centimes)' };
  if (typeof data.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return { error: 'Date invalide' };
  if (!data.label) return { error: 'Le libellé est requis' };
  const account = await q1('SELECT id FROM accounts WHERE id = $1 AND user_id = $2', [data.account_id, userId]);
  if (!account) return { error: 'Compte introuvable' };
  if (data.category_id !== null && data.category_id !== undefined) {
    const cat = await q1('SELECT id, type FROM categories WHERE id = $1 AND user_id = $2', [data.category_id, userId]);
    if (!cat) return { error: 'Catégorie introuvable' };
    if (cat.type !== data.type) return { error: 'La catégorie ne correspond pas au type de transaction' };
    data.category_id = cat.id;
  } else {
    data.category_id = null;
  }
  return { data };
}

router.get('/', async (req, res) => {
  const { month, account_id, category_id, type, search } = req.query;
  const clauses = [];
  const params = [req.userId];
  if (month) {
    const m = parseMonth(month, false);
    if (!m) return badRequest(res, 'Mois invalide (format YYYY-MM)');
    const { start, end } = monthRange(m);
    clauses.push('t.date >= $2 AND t.date <= $3');
    params.push(start, end);
  }
  if (account_id) {
    clauses.push(`t.account_id = $${params.length + 1}`);
    params.push(Number(account_id));
  }
  if (category_id) {
    clauses.push(`t.category_id = $${params.length + 1}`);
    params.push(Number(category_id));
  }
  if (type) {
    if (!['expense', 'income'].includes(type)) return badRequest(res, 'Type invalide');
    clauses.push(`t.type = $${params.length + 1}`);
    params.push(type);
  }
  if (search) {
    clauses.push(`(t.label LIKE $${params.length + 1} OR t.note LIKE $${params.length + 1})`);
    params.push(`%${search}%`);
  }
  const where = clauses.length ? ` AND ${clauses.join(' AND ')}` : '';
  res.json(await q(`${SELECT}${where} ORDER BY t.date DESC, t.id DESC`, params));
});

router.post('/', async (req, res) => {
  const { data, error } = await validate(req.body || {}, req.userId);
  if (error) return badRequest(res, error);
  const row = await q1(
    `INSERT INTO transactions (user_id, account_id, category_id, type, amount, date, label, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, account_id, category_id, type, amount, date, label, note, recurring_id`,
    [req.userId, data.account_id, data.category_id, data.type, data.amount, data.date, data.label, data.note]
  );
  const full = await q1(`${SELECT} AND t.id = $2`, [req.userId, row.id]);
  res.status(201).json(full);
});

router.put('/:id', async (req, res) => {
  const existing = await q1('SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  if (!existing) return res.status(404).json({ error: 'Transaction introuvable' });
  const { data, error } = await validate(req.body || {}, req.userId, existing);
  if (error) return badRequest(res, error);
  await run(
    `UPDATE transactions SET account_id = $1, category_id = $2, type = $3, amount = $4, date = $5, label = $6, note = $7
     WHERE id = $8 AND user_id = $9`,
    [data.account_id, data.category_id, data.type, data.amount, data.date, data.label, data.note, existing.id, req.userId]
  );
  res.json(await q1(`${SELECT} AND t.id = $2`, [req.userId, existing.id]));
});

router.delete('/:id', async (req, res) => {
  const result = await run('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Transaction introuvable' });
  res.status(204).end();
});

export default router;
