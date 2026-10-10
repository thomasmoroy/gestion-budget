import { q, q1, run } from './db.js';
import { monthRange } from './utils.js';

const pad = (n) => String(n).padStart(2, '0');

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/**
 * Synchronise les montants fixes du mois donné pour un utilisateur :
 * - actif + jamais généré → crée la transaction
 * - actif + déjà généré (même si supprimée à la main) → ne régénère pas
 * - actif + transaction présente → met à jour si les valeurs ont changé
 * - inactif → supprime la transaction générée
 */
export async function syncRecurring(userId, month) {
  const { start, end } = monthRange(month);
  const dim = daysInMonth(month);
  const items = await q('SELECT * FROM recurring WHERE user_id = $1', [userId]);

  for (const r of items) {
    const tx = await q1(
      'SELECT * FROM transactions WHERE recurring_id = $1 AND user_id = $2 AND date >= $3 AND date <= $4',
      [r.id, userId, start, end]
    );
    const generated = await q1(
      'SELECT 1 AS one FROM recurring_generated WHERE recurring_id = $1 AND month = $2',
      [r.id, month]
    );

    if (!r.active) {
      if (tx) await run('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [tx.id, userId]);
      if (generated) {
        await run('DELETE FROM recurring_generated WHERE recurring_id = $1 AND month = $2', [r.id, month]);
      }
      continue;
    }

    const date = `${month}-${pad(Math.min(r.date_day, dim))}`;

    if (!generated) {
      await run(
        `INSERT INTO transactions (user_id, account_id, category_id, type, amount, date, label, note, recurring_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [userId, r.account_id, r.category_id, r.type, r.amount, date, r.label, 'Montant fixe', r.id]
      );
      await run('INSERT INTO recurring_generated (recurring_id, month) VALUES ($1, $2)', [r.id, month]);
      continue;
    }

    if (
      tx &&
      (tx.amount !== r.amount ||
        tx.date !== date ||
        tx.label !== r.label ||
        tx.category_id !== r.category_id ||
        tx.account_id !== r.account_id)
    ) {
      await run(
        'UPDATE transactions SET account_id = $1, category_id = $2, amount = $3, date = $4, label = $5 WHERE id = $6 AND user_id = $7',
        [r.account_id, r.category_id, r.amount, date, r.label, tx.id, userId]
      );
    }
  }
}

export async function listRecurring(userId, month) {
  await syncRecurring(userId, month);
  const { start, end } = monthRange(month);
  return q(
    `SELECT r.*, c.name AS category_name, c.color AS category_color, a.name AS account_name,
            (SELECT t.id FROM transactions t
              WHERE t.recurring_id = r.id AND t.user_id = r.user_id AND t.date >= $2 AND t.date <= $3) AS tx_id,
            (SELECT t.date FROM transactions t
              WHERE t.recurring_id = r.id AND t.user_id = r.user_id AND t.date >= $2 AND t.date <= $3) AS tx_date
     FROM recurring r
     LEFT JOIN categories c ON c.id = r.category_id
     LEFT JOIN accounts a ON a.id = r.account_id
     WHERE r.user_id = $1
     ORDER BY r.type, r.label`,
    [userId, start, end]
  ).then((rows) => rows.map((r) => ({ ...r, active: Boolean(r.active), generated: r.tx_id != null })));
}
