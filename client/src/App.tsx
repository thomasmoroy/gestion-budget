import { NavLink, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Accounts from './pages/Accounts'
import Categories from './pages/Categories'
import RecurringPage from './pages/Recurring'
import Export from './pages/Export'
import Connexion from './pages/Connexion'
import Onboarding from './components/Onboarding'
import { useApi } from './useApi'
import { useAuth } from './auth'
import type { Account } from './types'

const NAV = [
  { to: '/', label: 'Tableau de bord', icon: '◈' },
  { to: '/transactions', label: 'Transactions', icon: '⇄' },
  { to: '/fixes', label: 'Fixes', icon: '↻' },
  { to: '/budgets', label: 'Budgets', icon: '◎' },
  { to: '/comptes', label: 'Comptes', icon: '▤' },
  { to: '/categories', label: 'Catégories', icon: '◍' },
  { to: '/export', label: 'Export', icon: '⤓' },
]

function Loading({ label = 'Chargement…' }: { label?: string }) {
  return <p className="muted loading-screen">{label}</p>
}

function AppContent() {
  const accounts = useApi<Account[]>('/api/accounts')

  if (accounts.loading) return <Loading />
  if (accounts.error) return <p className="error-box loading-screen">{accounts.error}</p>
  if ((accounts.data?.length ?? 1) === 0) return <Onboarding onDone={accounts.reload} />

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">€</span>
          <div>
            <strong>Budget</strong>
            <span className="muted small">Gestion de budget</span>
          </div>
        </div>
        <nav>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <LogoutButton />
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/fixes" element={<RecurringPage />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/comptes" element={<Accounts />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/export" element={<Export />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  )
}

function LogoutButton() {
  const { signOut, session } = useAuth()
  const email = session?.user?.email
  return (
    <div className="sidebar-footer">
      {email && <span className="muted small" title={email}>{email}</span>}
      <button type="button" className="btn ghost logout-btn" onClick={signOut}>
        Se déconnecter
      </button>
    </div>
  )
}

export default function App() {
  const { session, loading } = useAuth()

  if (loading) return <Loading />
  if (!session) return <Connexion />
  return <AppContent />
}
