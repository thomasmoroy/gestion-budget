import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
let supabase = null;
if (url && anonKey) {
  supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Cache simple token → user (60 s) pour limiter les appels réseau par requête
const cache = new Map();
const CACHE_TTL = 60_000;

export function authConfigured() {
  return Boolean(supabase);
}

export async function requireAuth(req, res, next) {
  // Borne de test locale : jamais active en production
  const testUserId = process.env.TEST_USER_ID;
  if (testUserId && process.env.NODE_ENV !== 'production') {
    req.userId = req.headers['x-test-user'] || testUserId;
    return next();
  }

  if (!supabase) {
    return res.status(500).json({
      error: 'Authentification non configurée : SUPABASE_URL et SUPABASE_ANON_KEY sont requis côté serveur.',
    });
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentification requise' });

  try {
    const now = Date.now();
    const hit = cache.get(token);
    if (hit && hit.expires > now) {
      req.userId = hit.userId;
      return next();
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.id) {
      return res.status(401).json({ error: 'Session invalide ou expirée' });
    }
    cache.set(token, { userId: data.user.id, expires: now + CACHE_TTL });
    if (cache.size > 500) cache.clear();
    req.userId = data.user.id;
    next();
  } catch (e) {
    console.error('Erreur vérification du token :', e.message);
    res.status(401).json({ error: 'Authentification impossible' });
  }
}
