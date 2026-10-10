import { Router } from 'express';
import { q1, run } from '../db.js';
import { badRequest, parseMonth } from '../utils.js';
import { listRecurring, syncRecurring, currentMonth } from '../recurring.js';

const router = Router();

router.get('/', async (req, res) => {
  const month = parseMonth(req.query.month);
  if (!month) return badRequest(res, 'Mois invalide (format YYYY-MM)');
  res.json(await listRecurring(req.userId, month));
});

async function validate(body, userId, existing = null) {
  const data = {
    label: (body.label ?? existing?.label ?? '').trim(),
    type: body.type ?? existing?.type,
    amount: body.amount ?? existing?.amount,
    date_day: body.date_day ?? existing?.date_day ?? 1,
    category_id: body.category_id !== undefined ? body.category_id : existing?.category_id,
    account_id: body.account_id ?? existing?.account_id,
    active: body.active !== undefined ? Boolean(body.active) : existing?.active ?? true,
  };
  if (!data.label) return { error: 'Le libellé est requis' };
  if (!['expense', 'income'].includes(data.type)) return { error: 'Type invalide' };
  if (!Number.isInteger(data.amount) || data.amount <= 0) return { error: 'Montant invalide (en centimes)' };
  if (!Number.isInteger(data.date_day) || data.date_day < 1 || data.date_day > 31) return { error: 'Jour invalide' };
  const account = await q1('SELECT id FROM accounts WHERE id = $1 AND user_id = $2', [data.account_id, userId]);
  if (!account) return { error: 'Compte introuvable' };
  if (data.category_id !== null && data.category_id !== undefined) {
    const cat = await q1('SELECT id, type FROM categories WHERE id = $1 AND user_id = $2', [data.category_id, userId]);
    if (!cat) return { error: 'Catégorie introuvable' };
    if (cat.type !== data.type) return { error: 'La catégorie ne correspond pas au type' };
    data.category_id = cat.id;
  } else {
    data.category_id = null;
  }
  return { data };
}

router.post('/', async (req, res) => {
  const { data, error } = await validate(req.body || {}, req.userId);
  if (error) return badRequest(res, error);
  const row = await q1(
    `INSERT INTO recurring (user_id, label, type, amount, date_day, category_id, account_id, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [req.userId, data.label, data.type, data.amount, data.date_day, data.category_id, data.account_id, data.active]
  );
  const month = currentMonth();
  await syncRecurring(req.userId, month);
  res.status(201).json((await listRecurring(req.userId, month)).find((r) => r.id === row.id));
});

router.put('/:id', async (req, res) => {
  const existing = await q1('SELECT * FROM recurring WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  if (!existing) return res.status(404).json({ error: 'Montant fixe introuvable' });
  const { data, error } = await validate(req.body || {}, req.userId, existing);
  if (error) return badRequest(res, error);
  await run(
    `UPDATE recurring SET label = $1, type = $2, amount = $3, date_day = $4, category_id = $5, account_id = $6, active = $7
     WHERE id = $8 AND user_id = $9`,
    [
      data.label,
      data.type,
      data.amount,
      data.date_day,
      data.category_id,
      data.account_id,
      data.active,
      existing.id,
      req.userId,
    ]
  );
  const month = currentMonth();
  if (data.active) {
    // force la régénération de la transaction du mois courant avec les nouvelles valeurs
    await run('DELETE FROM recurring_generated WHERE recurring_id = $1 AND month = $2', [existing.id, month]);
  }
  await syncRecurring(req.userId, month);
  res.json((await listRecurring(req.userId, month)).find((r) => r.id === existing.id));
});

router.delete('/:id', async (req, res) => {
  const existing = await q1('SELECT id FROM recurring WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  if (!existing) return res.status(404).json({ error: 'Montant fixe introuvable' });
  await run('DELETE FROM recurring WHERE id = $1 AND user_id = $2', [existing.id, req.userId]);
  await syncRecurring(req.userId, currentMonth());
  res.status(204).end();
});

export default router;
