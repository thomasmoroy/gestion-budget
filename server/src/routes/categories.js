import { Router } from 'express';
import { q, q1, run } from '../db.js';
import { badRequest } from '../utils.js';

const router = Router();

router.get('/', async (req, res) => {
  res.json(await q('SELECT * FROM categories WHERE user_id = $1 ORDER BY type, name', [req.userId]));
});

router.post('/', async (req, res) => {
  const { name, type, color = '#8884d8' } = req.body || {};
  if (!name || typeof name !== 'string') return badRequest(res, 'Le nom est requis');
  if (!['expense', 'income'].includes(type)) return badRequest(res, 'Type de catégorie invalide');
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return badRequest(res, 'Couleur invalide');
  try {
    const row = await q1(
      'INSERT INTO categories (user_id, name, type, color) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.userId, name.trim(), type, color]
    );
    res.status(201).json(row);
  } catch (e) {
    if (e.code === '23505') return badRequest(res, 'Ce nom de catégorie existe déjà');
    throw e;
  }
});

router.put('/:id', async (req, res) => {
  const existing = await q1('SELECT * FROM categories WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  if (!existing) return res.status(404).json({ error: 'Catégorie introuvable' });
  const { name = existing.name, type = existing.type, color = existing.color } = req.body || {};
  if (!name || typeof name !== 'string') return badRequest(res, 'Le nom est requis');
  if (!['expense', 'income'].includes(type)) return badRequest(res, 'Type de catégorie invalide');
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return badRequest(res, 'Couleur invalide');
  try {
    const row = await q1(
      'UPDATE categories SET name = $1, type = $2, color = $3 WHERE id = $4 AND user_id = $5 RETURNING *',
      [name.trim(), type, color, existing.id, req.userId]
    );
    res.json(row);
  } catch (e) {
    if (e.code === '23505') return badRequest(res, 'Ce nom de catégorie existe déjà');
    throw e;
  }
});

router.delete('/:id', async (req, res) => {
  const result = await run('DELETE FROM categories WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Catégorie introuvable' });
  res.status(204).end();
});

export default router;
