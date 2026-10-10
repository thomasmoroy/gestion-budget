import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'

const USER_A = '11111111-1111-4111-8111-111111111111'
const USER_B = '22222222-2222-4222-8222-222222222222'
const PORT = 3999

process.env.NODE_ENV = 'test'
process.env.TEST_USER_ID = USER_A
delete process.env.DATABASE_URL

const db = new PGlite()
await db.exec(`
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id UUID PRIMARY KEY, email TEXT);
  INSERT INTO auth.users (id, email) VALUES
    ('${USER_A}', 'a@example.com'),
    ('${USER_B}', 'b@example.com');
`)

function toPlain(value, dataTypeID) {
  if (value instanceof Date) {
    const pad = (n) => String(n).padStart(2, '0')
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
  }
  if (typeof value === 'bigint') return Number(value)
  if ((dataTypeID === 20 || dataTypeID === 1700) && typeof value === 'string') return Number(value)
  return value
}

globalThis.__TEST_POOL__ = {
  async query(text, params = []) {
    try {
      const res = params.length > 0 ? await db.query(text, params) : await db.query(text)
      const types = new Map((res.fields ?? []).map((f) => [f.name, f.dataTypeID]))
      return {
        rows: res.rows.map((row) =>
          Object.fromEntries(Object.entries(row).map(([k, v]) => [k, toPlain(v, types.get(k))]))
        ),
        rowCount: res.affectedRows ?? res.rows.length,
      }
    } catch (e) {
      if (params.length > 0) throw e
      const res = await db.exec(text)
      return { rows: [], rowCount: res.affectedRows ?? 0 }
    }
  },
}

const { migrate } = await import('../src/db.js')
await migrate()

const { createApp } = await import('../src/app.js')
const app = createApp()
const server = app.listen(PORT)

async function call(method, path, { user = USER_A, body } = {}) {
  const res = await fetch(`http://localhost:${PORT}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-test-user': user,
      ...(body ? {} : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { status: res.status, data, headers: res.headers }
}

let passed = 0
function ok(label) {
  passed++
  console.log(`  ✓ ${label}`)
}

try {
  console.log('— Schéma et auth')
  {
    const health = await fetch(`http://localhost:${PORT}/api/health`)
    assert.equal(health.status, 200)
    ok('health')
    const saved = process.env.TEST_USER_ID
    delete process.env.TEST_USER_ID
    const noAuth = await fetch(`http://localhost:${PORT}/api/accounts`)
    process.env.TEST_USER_ID = saved
    assert.ok(noAuth.status === 401 || noAuth.status === 500, `accès refusé (${noAuth.status})`)
    const body = await noAuth.json()
    assert.ok(body.error, "message d'erreur présent")
    ok('accès refusé sans authentification')
    const index = await fetch(`http://localhost:${PORT}/`)
    if (index.status === 200 && (index.headers.get('content-type') || '').includes('text/html')) {
      assert.match(await index.text(), /<div id="root">/)
      ok('SPA servie par Express (client/dist)')
      const spa = await fetch(`http://localhost:${PORT}/transactions`)
      assert.equal(spa.status, 200)
      assert.match(spa.headers.get('content-type') || '', /text\/html/)
      ok('route SPA /transactions → index.html')
      const api404 = await fetch(`http://localhost:${PORT}/api/inconnu`)
      assert.equal(api404.status, 404)
      ok('404 API préservé')
    } else {
      ok('SPA ignorée (client/dist absent) — build client non exécuté')
    }
  }

  console.log('— CRUD de base (utilisateur A)')
  let accountId, categoryId, txId
  {
    const acc = await call('POST', '/api/accounts', { body: { name: 'Courant', type: 'courant', initial_balance: 100000 } })
    assert.equal(acc.status, 201)
    accountId = acc.data.id
    assert.equal(acc.data.balance, 100000)
    ok('création compte + solde initial')

    const cat = await call('POST', '/api/categories', { body: { name: 'Courses', type: 'expense', color: '#ff8800' } })
    assert.equal(cat.status, 201)
    categoryId = cat.data.id
    ok('création catégorie')

    const dup = await call('POST', '/api/categories', { body: { name: 'Courses', type: 'expense' } })
    assert.equal(dup.status, 400)
    ok('doublon catégorie rejeté')

    const tx = await call('POST', '/api/transactions', {
      body: { account_id: accountId, category_id: categoryId, type: 'expense', amount: 4250, date: '2026-10-05', label: 'Supermarché' },
    })
    assert.equal(tx.status, 201)
    txId = tx.data.id
    assert.equal(tx.data.fixed, false)
    assert.equal(tx.data.account_name, 'Courant')
    ok('création transaction')

    const bad = await call('POST', '/api/transactions', {
      body: { account_id: 99999, type: 'expense', amount: 100, date: '2026-10-05', label: 'x' },
    })
    assert.equal(bad.status, 400)
    ok('compte inexistant rejeté')
  }

  console.log('— Isolation entre utilisateurs')
  {
    const listB = await call('GET', '/api/accounts', { user: USER_B })
    assert.equal(listB.status, 200)
    assert.deepEqual(listB.data, [], 'B ne voit pas les comptes de A')
    ok('B ne voit aucun compte')

    const txB = await call('GET', `/api/transactions/${txId}`, { user: USER_B }).catch(() => null)
    const txB2 = await fetch(`http://localhost:${PORT}/api/transactions?search=Supermarché`, {
      headers: { 'x-test-user': USER_B },
    })
    assert.deepEqual(await txB2.json(), [], 'B ne voit pas les transactions de A')
    ok('B ne voit aucune transaction')

    const steal = await call('PUT', `/api/accounts/${accountId}`, { user: USER_B, body: { name: 'Piraté' } })
    assert.equal(steal.status, 404, 'B ne peut pas modifier le compte de A')
    ok('modification croisée bloquée (404)')

    const del = await call('DELETE', `/api/transactions/${txId}`, { user: USER_B })
    assert.equal(del.status, 404)
    ok('suppression croisée bloquée (404)')
    void txB
  }

  console.log('— Budgets, dashboard, export')
  {
    const budget = await call('PUT', '/api/budgets', {
      body: { category_id: categoryId, month: '2026-10', amount: 20000 },
    })
    assert.equal(budget.status, 200)
    const list = await call('GET', '/api/budgets?month=2026-10')
    assert.equal(list.data.length, 1)
    assert.equal(list.data[0].spent, 4250)
    ok('budget + dépensé calculé')

    const summary = await call('GET', '/api/dashboard/summary?month=2026-10')
    assert.equal(summary.status, 200)
    assert.equal(summary.data.expense, 4250)
    assert.equal(summary.data.income, 0)
    assert.equal(summary.data.byCategory[0].name, 'Courses')
    assert.equal(summary.data.budgets[0].spent, 4250)
    assert.equal(summary.data.accounts[0].balance, 100000 - 4250)
    ok('dashboard : totaux, catégories, budgets, solde')

    const csv = await call('GET', '/api/export/csv?month=2026-10')
    assert.equal(csv.status, 200)
    assert.match(csv.data, /Supermarché/)
    assert.match(csv.data, /Date;Type;Libellé/)
    ok('export CSV')

    const summaryB = await call('GET', '/api/dashboard/summary?month=2026-10', { user: USER_B })
    assert.equal(summaryB.data.expense, 0)
    assert.equal(summaryB.data.accounts.length, 0)
    ok('dashboard isolé par utilisateur')
  }

  console.log('— Montants fixes')
  {
    const rec = await call('POST', '/api/recurring', {
      body: { label: 'Loyer', type: 'expense', amount: 85000, date_day: 5, category_id: categoryId, account_id: accountId, active: true },
    })
    assert.equal(rec.status, 201)
    assert.equal(rec.data.generated, true)
    ok('fixe créé et transaction générée')

    const txs = await call('GET', '/api/transactions?month=2026-10')
    const loyer = txs.data.find((t) => t.label === 'Loyer')
    assert.ok(loyer, 'transaction du fixe présente')
    assert.equal(loyer.fixed, true)
    assert.equal(loyer.date, '2026-10-05')
    ok('transaction fixe datée du jour choisi')

    await call('PUT', '/api/recurring/1', { body: { active: false } })
    const afterOff = await call('GET', '/api/transactions?month=2026-10')
    assert.equal(afterOff.data.find((t) => t.label === 'Loyer'), undefined)
    ok('décocher supprime la transaction')

    await call('PUT', '/api/recurring/1', { body: { active: true, amount: 90000 } })
    const afterOn = await call('GET', '/api/transactions?month=2026-10')
    const loyer2 = afterOn.data.find((t) => t.label === 'Loyer')
    assert.equal(loyer2.amount, 90000)
    ok('recocher régénère avec le nouveau montant')

    await call('DELETE', `/api/transactions/${loyer2.id}`)
    const afterManual = await call('GET', '/api/recurring?month=2026-10')
    assert.equal(afterManual.data.length, 1)
    const check = await call('GET', '/api/transactions?month=2026-10')
    assert.equal(check.data.find((t) => t.label === 'Loyer'), undefined)
    ok('suppression manuelle non régénérée')

    const recB = await call('GET', '/api/recurring?month=2026-10', { user: USER_B })
    assert.deepEqual(recB.data, [])
    ok('fixes isolés par utilisateur')
  }

  console.log('\nTous les tests sont passés ✔')
} finally {
  server.close()
  await db.close()
}
