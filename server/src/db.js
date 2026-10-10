import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { types } = pg;
// BIGINT et NUMERIC reviennent en string par défaut : on les passe en number (montants en centimes)
types.setTypeParser(20, (v) => Number(v));
types.setTypeParser(1700, (v) => Number(v));
// DATE : garder la chaîne YYYY-MM-DD
types.setTypeParser(1082, (v) => v);

let pool = null;

function getPool() {
  if (globalThis.__TEST_POOL__) return globalThis.__TEST_POOL__;
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL manquant (base Supabase). Copiez server/.env.example vers server/.env et renseignez la chaîne de connexion.'
      );
    }
    pool = new pg.Pool({
      connectionString,
      max: 10,
      ssl: /sslmode=(require|prefer|verify-ca|verify-full)/.test(connectionString)
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }
  return pool;
}

export async function q(text, params = []) {
  const res = await getPool().query(text, params);
  return res.rows;
}

export async function q1(text, params = []) {
  const res = await getPool().query(text, params);
  return res.rows[0];
}

export async function run(text, params = []) {
  const res = await getPool().query(text, params);
  return { rowCount: res.rowCount, rows: res.rows };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', '001_init.sql'), 'utf8');
  await getPool().query(sql);
}
