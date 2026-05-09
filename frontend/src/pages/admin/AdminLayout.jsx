import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, UtensilsCrossed, TableProperties,
  ClipboardList, BarChart3, Users, LogOut, KeyRound, Menu, X, Settings, History,
  AlertTriangle
} from 'lucide-react'
import { useState, useEffect } from 'react'
import clsx from 'clsx'
import { logout } from '../../api/auth'
import api from '../../api/axios'
import { useAuthStore } from '../../store/authStore'
import ChangePasswordModal from '../../components/common/ChangePasswordModal'

function SubscriptionBanner({ subscription, restaurantActive }) {
  // Restaurant suspendu par le super admin
  if (!restaurantActive) {
    return (
      <div className="bg-red-700 text-white text-sm px-4 py-2.5 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="font-semibold">Compte suspendu.</span>
        <span>Votre restaurant a été suspendu par l'administrateur. Contactez le support.</span>
      </div>
    )
  }

  if (!subscription) return null

  const { status, is_active, days_left, expires_at } = subscription

  // Abonnement expiré
  if (!is_active) {
    return (
      <div className="bg-red-600 text-white text-sm px-4 py-2.5 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="font-semibold">Abonnement expiré.</span>
        <span>Contactez le support pour renouveler votre accès.</span>
      </div>
    )
  }

  // Trial expirant dans ≤ 7 jours
  if (status === 'trial' && days_left !== null && days_left <= 7) {
    return (
      <div className="bg-amber-500 text-white text-sm px-4 py-2.5 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>
          <span className="font-semibold">Période d'essai :</span>{' '}
          {days_left === 0
            ? "expire aujourd'hui !"
            : `expire dans ${days_left} jour${days_left > 1 ? 's' : ''}.`}
          {' '}Contactez-nous pour activer votre abonnement.
        </span>
      </div>
    )
  }

  // Trial > 7 jours restants — discret dans la sidebar uniquement (pas de bannière)
  return null
}

const NAV_ITEMS = [
  { to: '/admin',           label: 'Tableau de Bord',  icon: LayoutDashboard, end: true },
  { to: '/admin/menu',      label: 'Gérer le Menu',    icon: UtensilsCrossed },
  { to: '/admin/tables',    label: 'Gérer les Tables', icon: TableProperties },
  { to: '/admin/orders',    label: 'Commandes',        icon: ClipboardList },
  { to: '/admin/history',   label: 'Historique',       icon: History },
  { to: '/admin/staff',     label: 'Équipe',           icon: Users },
  { to: '/admin/stats',     label: 'Statistiques',     icon: BarChart3 },
  { to: '/admin/settings',  label: 'Paramètres',       icon: Settings },
]

export default function AdminLayout() {
  const { user, clearAuth, setUser } = useAuthStore()
  const subscription      = user?.restaurant?.subscription ?? null
  const restaurantActive  = user?.restaurant?.is_active ?? true

  // Rafraîchir silencieusement les données utilisateur (subscription, days_left)
  // _silent: true → évite la déconnexion automatique si la requête échoue
  useEffect(() => {
    api.get('/auth/me', { _silent: true })
      .then(({ data }) => { if (data?.user) setUser(data.user) })
      .catch(() => {})
  }, [])
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pwdModal, setPwdModal]       = useState(false)

  async function handleLogout() {
    await logout().catch(() => {})
    clearAuth()
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">RestoQR</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary-50 text-primary-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Badge trial discret */}
      {subscription?.status === 'trial' && subscription?.days_left > 7 && (
        <div className="mx-3 mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs text-amber-700 font-medium">
            Essai gratuit · {subscription.days_left}j restants
          </p>
        </div>
      )}

      {/* User */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-600 font-bold text-sm">
              {user?.name?.[0]?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
          <button onClick={() => setPwdModal(true)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Changer le mot de passe">
            <KeyRound className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={handleLogout} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Déconnexion">
            <LogOut className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-60 bg-white border-r border-gray-100 flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Sidebar — mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-white h-full flex flex-col z-50 shadow-xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-gray-900">RestoQR</span>
        </div>

        <SubscriptionBanner subscription={subscription} restaurantActive={restaurantActive} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      <ChangePasswordModal open={pwdModal} onClose={() => setPwdModal(false)} />
    </div>
  )
}
