import { Router } from 'express';
import { q, q1, run } from '../db.js';
import { badRequest, monthRange, parseMonth } from '../utils.js';

const router = Router();

router.get('/', async (req, res) => {
  const month = parseMonth(req.query.month);
  if (!month) return badRequest(res, 'Mois invalide (format YYYY-MM)');
  const { start, end } = monthRange(month);
  res.json(
    await q(
      `SELECT b.id, b.category_id, b.month, b.amount,
              c.name AS category_name, c.color AS category_color, c.type AS category_type,
              COALESCE(SUM(t.amount), 0) AS spent
       FROM budgets b
       JOIN categories c ON c.id = b.category_id AND c.user_id = b.user_id
       LEFT JOIN transactions t
         ON t.category_id = b.category_id AND t.user_id = b.user_id
        AND t.type = 'expense' AND t.date >= $2 AND t.date <= $3
       WHERE b.user_id = $1 AND b.month = $4
       GROUP BY b.id, c.name, c.color, c.type
       ORDER BY c.name`,
      [req.userId, start, end, month]
    )
  );
});

router.put('/', async (req, res) => {
  const { category_id, amount } = req.body || {};
  const month = parseMonth(req.body?.month);
  if (!month) return badRequest(res, 'Mois invalide (format YYYY-MM)');
  if (!Number.isInteger(amount) || amount < 0) return badRequest(res, 'Montant invalide (en centimes)');
  const cat = await q1('SELECT id, type FROM categories WHERE id = $1 AND user_id = $2', [category_id, req.userId]);
  if (!cat) return badRequest(res, 'Catégorie introuvable');
  if (cat.type !== 'expense') return badRequest(res, 'Un budget ne peut être défini que sur une catégorie de dépense');

  if (amount === 0) {
    await run('DELETE FROM budgets WHERE category_id = $1 AND month = $2 AND user_id = $3', [cat.id, month, req.userId]);
    return res.json({ category_id: cat.id, month, amount: 0 });
  }
  await run(
    `INSERT INTO budgets (user_id, category_id, month, amount) VALUES ($1, $2, $3, $4)
     ON CONFLICT (category_id, month) DO UPDATE SET amount = EXCLUDED.amount`,
    [req.userId, cat.id, month, amount]
  );
  res.json({ category_id: cat.id, month, amount });
});

export default router;
