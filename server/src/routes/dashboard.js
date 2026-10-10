import { Router } from 'express';
import { q, q1 } from '../db.js';
import { badRequest, monthRange, parseMonth, lastMonths, today } from '../utils.js';

const router = Router();

router.get('/summary', async (req, res) => {
  const month = parseMonth(req.query.month);
  if (!month) return badRequest(res, 'Mois invalide (format YYYY-MM)');
  const { start, end } = monthRange(month);
  const uid = req.userId;

  const totals = await q1(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
     FROM transactions WHERE user_id = $1 AND date >= $2 AND date <= $3`,
    [uid, start, end]
  );

  const byCategory = (
    await q(
      `SELECT c.id AS category_id, c.name, c.color, COUNT(t.id) AS count, SUM(t.amount) AS total
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.type = 'expense' AND t.date >= $2 AND t.date <= $3
       GROUP BY c.id, c.name, c.color
       ORDER BY total DESC NULLS LAST`,
      [uid, start, end]
    )
  ).map((r) => ({ ...r, name: r.name ?? 'Sans catégorie', color: r.color ?? '#9ca3af' }));

  const months = lastMonths(6, new Date(`${start}T00:00:00`));
  const evolution = [];
  for (const m of months) {
    const { start: s, end: e } = monthRange(m);
    const row = await q1(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
       FROM transactions WHERE user_id = $1 AND date >= $2 AND date <= $3`,
      [uid, s, e]
    );
    evolution.push({ month: m, income: row.income, expense: row.expense });
  }

  const budgetRows = await q(
    `SELECT b.amount AS budget, c.id AS category_id, c.name, c.color
     FROM budgets b JOIN categories c ON c.id = b.category_id
     WHERE b.user_id = $1 AND b.month = $2
     ORDER BY c.name`,
    [uid, month]
  );
  const budgets = [];
  for (const b of budgetRows) {
    const spent = await q1(
      `SELECT COALESCE(SUM(amount), 0) AS spent FROM transactions
       WHERE user_id = $1 AND type = 'expense' AND category_id = $2 AND date >= $3 AND date <= $4`,
      [uid, b.category_id, start, end]
    );
    budgets.push({
      ...b,
      spent: spent.spent,
      remaining: b.budget - spent.spent,
      ratio: b.budget > 0 ? spent.spent / b.budget : 0,
    });
  }

  const accounts = await q(
    `SELECT a.id, a.name, a.type,
            a.initial_balance + COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) AS balance
     FROM accounts a
     LEFT JOIN transactions t ON t.account_id = a.id AND t.user_id = a.user_id AND t.date <= $2
     WHERE a.user_id = $1
     GROUP BY a.id, a.name, a.type, a.initial_balance
     ORDER BY a.id`,
    [uid, today()]
  );

  res.json({
    month,
    income: totals.income,
    expense: totals.expense,
    net: totals.income - totals.expense,
    byCategory,
    evolution,
    budgets,
    accounts,
  });
});

export default router;
