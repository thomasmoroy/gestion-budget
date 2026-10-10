import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import accounts from './routes/accounts.js';
import categories from './routes/categories.js';
import transactions from './routes/transactions.js';
import budgets from './routes/budgets.js';
import recurring from './routes/recurring.js';
import dashboard from './routes/dashboard.js';
import exportRoutes from './routes/export.js';
import { requireAuth } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
const indexHtml = path.join(clientDist, 'index.html');

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/api/accounts', requireAuth, accounts);
  app.use('/api/categories', requireAuth, categories);
  app.use('/api/transactions', requireAuth, transactions);
  app.use('/api/budgets', requireAuth, budgets);
  app.use('/api/recurring', requireAuth, recurring);
  app.use('/api/dashboard', requireAuth, dashboard);
  app.use('/api/export', requireAuth, exportRoutes);

  // Production : le serveur expose aussi le client construit (même origine, pas de CORS)
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(clientDist));
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(indexHtml);
      }
      next();
    });
  }

  app.use((req, res) => res.status(404).json({ error: 'Route introuvable' }));

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  });

  return app;
}
