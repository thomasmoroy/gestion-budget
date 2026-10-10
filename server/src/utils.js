export function parseMonth(value, fallback = true) {
  const now = new Date();
  const def = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (!value && fallback) return def;
  if (typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)) return value;
  return null;
}

export function monthRange(month) {
  const [y, m] = month.split('-').map(Number);
  return {
    start: `${month}-01`,
    end: `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`,
  };
}

export function lastMonths(n, from = new Date()) {
  const out = [];
  const d = new Date(from.getFullYear(), from.getMonth(), 1);
  for (let i = 0; i < n; i++) {
    out.unshift(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

export function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

export function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
