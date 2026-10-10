import { useAuth } from '../auth'

export default function Connexion() {
  const { signInWithGoogle, configured } = useAuth()

  if (!configured) {
    return (
      <div className="onboarding">
        <div className="onboarding-card card">
          <span className="brand-mark">€</span>
          <h1>Configuration requise</h1>
          <p className="muted">
            Renseignez l'URL du projet Supabase et sa clé anon avant le premier lancement.
          </p>
          <ul className="config-list">
            <li>
              <strong>client/.env</strong> → <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code>
            </li>
            <li>
              <strong>server/.env</strong> → <code>DATABASE_URL</code>, <code>SUPABASE_URL</code>,{' '}
              <code>SUPABASE_ANON_KEY</code>
            </li>
          </ul>
          <p className="muted small">Puis redémarrez avec npm run dev.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="onboarding">
      <div className="onboarding-card card">
        <span className="brand-mark">€</span>
        <h1>Bienvenue dans votre gestion de budget</h1>
        <p className="muted">Connectez-vous pour retrouver vos comptes, budgets et transactions en ligne.</p>
        <button type="button" className="btn google-btn" onClick={signInWithGoogle}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.3 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
          </svg>
          Continuer avec Google
        </button>
      </div>
    </div>
  )
}
