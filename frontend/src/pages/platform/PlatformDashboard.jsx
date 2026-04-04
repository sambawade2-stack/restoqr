import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  LogOut, Building2, Plus, Search, RefreshCw, CheckCircle,
  XCircle, AlertTriangle, TrendingUp, Users, ShieldCheck,
  ChevronDown, Edit3, Trash2, MoreVertical, KeyRound,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { logout } from '../../api/auth'
import {
  platformGetStats, platformGetRestaurants, platformCreateRestaurant,
  platformToggleStatus, platformUpdateSubscription, platformDeleteRestaurant,
} from '../../api/platform'
import { useAuthStore } from '../../store/authStore'
import Modal from '../../components/common/Modal'
import ChangePasswordModal from '../../components/common/ChangePasswordModal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import clsx from 'clsx'

const PLANS = [
  { key: 'free',  label: 'Gratuit',   price: '0 FCFA',      color: 'bg-gray-100 text-gray-700' },
  { key: 'basic', label: 'Basic',     price: '15 000 FCFA',  color: 'bg-blue-100 text-blue-700' },
  { key: 'pro',   label: 'Pro',       price: '35 000 FCFA',  color: 'bg-purple-100 text-purple-700' },
]

const planColor = (plan) =>
  PLANS.find(p => p.key === plan)?.color ?? 'bg-gray-100 text-gray-700'

const planLabel = (plan) =>
  PLANS.find(p => p.key === plan)?.label ?? plan

export default function PlatformDashboard() {
  const { user, clearAuth } = useAuthStore()

  // ── State ─────────────────────────────────────────────────────────────────
  const [stats, setStats]             = useState(null)
  const [restaurants, setRestaurants] = useState([])
  const [meta, setMeta]               = useState({ total: 0 })
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage]               = useState(1)

  // Modals
  const [createModal, setCreateModal]   = useState(false)
  const [subModal, setSubModal]         = useState(null)   // restaurant object
  const [deleteModal, setDeleteModal]   = useState(null)   // restaurant object
  const [pwdModal, setPwdModal]         = useState(false)
  const [saving, setSaving]             = useState(false)
  const [menuOpen, setMenuOpen]         = useState(null)   // restaurant id

  // Create form
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', currency: 'FCFA', timezone: 'Africa/Dakar',
    plan: 'basic', admin_name: '', admin_email: '', admin_password: '',
  })

  // Subscription form
  const [subForm, setSubForm] = useState({ plan: 'basic', expires_at: '' })

  // ── Data fetching ─────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try { const { data } = await platformGetStats(); setStats(data) } catch {}
  }, [])

  const loadRestaurants = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await platformGetRestaurants({ search, status: statusFilter, page })
      setRestaurants(data.data)
      setMeta(data.meta)
    } catch {}
    finally { setLoading(false) }
  }, [search, statusFilter, page])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { loadRestaurants() }, [loadRestaurants])

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await platformCreateRestaurant(form)
      toast.success('Restaurant créé !')
      setCreateModal(false)
      setForm({ name:'', email:'', phone:'', address:'', currency:'FCFA', timezone:'Africa/Dakar', plan:'basic', admin_name:'', admin_email:'', admin_password:'' })
      await Promise.all([loadStats(), loadRestaurants()])
    } catch (err) {
      const errors = err.response?.data?.errors
      const msg = errors ? Object.values(errors)[0][0] : err.response?.data?.message || 'Erreur'
      toast.error(msg)
    } finally { setSaving(false) }
  }

  async function handleToggleStatus(restaurant) {
    setMenuOpen(null)
    try {
      await platformToggleStatus(restaurant.id)
      toast.success(restaurant.is_active ? 'Restaurant suspendu' : 'Restaurant activé')
      await Promise.all([loadStats(), loadRestaurants()])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    }
  }

  async function handleUpdateSub(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await platformUpdateSubscription(subModal.id, subForm)
      toast.success('Abonnement mis à jour')
      setSubModal(null)
      await loadRestaurants()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await platformDeleteRestaurant(deleteModal.id)
      toast.success('Restaurant supprimé')
      setDeleteModal(null)
      await Promise.all([loadStats(), loadRestaurants()])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally { setSaving(false) }
  }

  async function handleLogout() {
    await logout().catch(() => {})
    clearAuth()
    window.location.href = '/login'
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900 text-lg">RestoQR — Plateforme</h1>
                <p className="text-xs text-gray-500">Super Admin · {user?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => Promise.all([loadStats(), loadRestaurants()])}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Actualiser">
                <RefreshCw className="w-4 h-4 text-gray-400" />
              </button>
              <button onClick={() => setPwdModal(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Changer le mot de passe">
                <KeyRound className="w-4 h-4 text-gray-400" />
              </button>
              <button onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <LogOut className="w-4 h-4" /> Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total restaurants" value={stats.total}      icon={<Building2 className="w-5 h-5"/>} color="bg-blue-500" />
            <StatCard label="Actifs"             value={stats.active}    icon={<CheckCircle className="w-5 h-5"/>} color="bg-green-500" />
            <StatCard label="Suspendus"          value={stats.suspended} icon={<XCircle className="w-5 h-5"/>}    color="bg-red-500" />
            <StatCard label="Expirent bientôt"  value={stats.expiring_soon} icon={<AlertTriangle className="w-5 h-5"/>} color="bg-amber-500" />
          </div>
        )}

        {/* ── Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-0.5">Zone d'administration de la plateforme</p>
            <p className="text-blue-600">Vous gérez uniquement les restaurants et abonnements. Les données internes (commandes, chiffres, produits) restent confidentielles et accessibles uniquement par les admins restaurant.</p>
          </div>
        </div>

        {/* ── Restaurants table ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary-500" />
              Restaurants ({meta.total})
            </h2>
            <div className="flex gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text" placeholder="Rechercher…"
                  className="input pl-9 text-sm"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                />
              </div>
              {/* Status filter */}
              <select className="input text-sm w-36"
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
                <option value="">Tous</option>
                <option value="active">Actifs</option>
                <option value="suspended">Suspendus</option>
              </select>
              {/* Add button */}
              <button onClick={() => setCreateModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors shrink-0">
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <LoadingSpinner size="lg" className="py-16" />
          ) : restaurants.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Aucun restaurant</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Restaurant</th>
                    <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Contact</th>
                    <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Plan</th>
                    <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Statut</th>
                    <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Expiration</th>
                    <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Utilisateurs</th>
                    <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {restaurants.map(r => (
                    <RestaurantRow
                      key={r.id}
                      restaurant={r}
                      menuOpen={menuOpen === r.id}
                      onMenuToggle={() => setMenuOpen(menuOpen === r.id ? null : r.id)}
                      onToggleStatus={() => handleToggleStatus(r)}
                      onEditSub={() => {
                        setMenuOpen(null)
                        setSubForm({ plan: r.subscription?.plan ?? 'basic', expires_at: r.subscription?.expires_at?.substring(0,10) ?? '' })
                        setSubModal(r)
                      }}
                      onDelete={() => { setMenuOpen(null); setDeleteModal(r) }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {meta.last_page > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
              <span>Page {meta.current_page} / {meta.last_page}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40">Préc.</button>
                <button disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40">Suiv.</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Create restaurant
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Ajouter un restaurant">
        <form onSubmit={handleCreate} className="space-y-4">
          <fieldset>
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Informations restaurant</legend>
            <div className="space-y-2">
              <input className="input" placeholder="Nom du restaurant *" required
                value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <input className="input" type="email" placeholder="Email du restaurant *" required
                value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                <input className="input" placeholder="Téléphone"
                  value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                <select className="input" value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}>
                  <option value="FCFA">FCFA</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="XOF">XOF</option>
                </select>
              </div>
              <textarea className="input resize-none" rows={2} placeholder="Adresse"
                value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Plan d'abonnement</legend>
            <div className="grid grid-cols-3 gap-2">
              {PLANS.map(p => (
                <button key={p.key} type="button" onClick={() => setForm({...form, plan: p.key})}
                  className={clsx(
                    'py-2 rounded-xl border-2 text-sm font-semibold transition-colors',
                    form.plan === p.key ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-gray-200 text-gray-600'
                  )}>
                  <div>{p.label}</div>
                  <div className="text-xs font-normal opacity-70">{p.price}/an</div>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Compte administrateur</legend>
            <div className="space-y-2">
              <input className="input" placeholder="Nom de l'admin *" required
                value={form.admin_name} onChange={e => setForm({...form, admin_name: e.target.value})} />
              <input className="input" type="email" placeholder="Email admin *" required
                value={form.admin_email} onChange={e => setForm({...form, admin_email: e.target.value})} />
              <input className="input" type="password" placeholder="Mot de passe (8 car. min) *" required minLength={8}
                value={form.admin_password} onChange={e => setForm({...form, admin_password: e.target.value})} />
            </div>
          </fieldset>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setCreateModal(false)}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
              {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : 'Créer le restaurant'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Update subscription
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal open={!!subModal} onClose={() => setSubModal(null)} title={`Abonnement — ${subModal?.name}`}>
        <form onSubmit={handleUpdateSub} className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Plan</p>
            <div className="grid grid-cols-3 gap-2">
              {PLANS.map(p => (
                <button key={p.key} type="button" onClick={() => setSubForm({...subForm, plan: p.key})}
                  className={clsx(
                    'py-2 rounded-xl border-2 text-sm font-semibold transition-colors',
                    subForm.plan === p.key ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-gray-200 text-gray-600'
                  )}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date d'expiration</label>
            <input type="date" className="input"
              value={subForm.expires_at} onChange={e => setSubForm({...subForm, expires_at: e.target.value})} />
            <p className="text-xs text-gray-400 mt-1">Laisser vide pour un accès illimité.</p>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setSubModal(null)}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
              {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Delete confirm
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Supprimer le restaurant">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
            <p className="font-semibold mb-1">⚠️ Action irréversible</p>
            <p>Le restaurant <strong>{deleteModal?.name}</strong> et tous ses utilisateurs seront désactivés et archivés. Les données seront conservées mais inaccessibles.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setDeleteModal(null)}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button onClick={handleDelete} disabled={saving}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
              {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : 'Confirmer la suppression'}
            </button>
          </div>
        </div>
      </Modal>

      <ChangePasswordModal open={pwdModal} onClose={() => setPwdModal(false)} />
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0', color)}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 leading-tight">{label}</p>
      </div>
    </div>
  )
}

function RestaurantRow({ restaurant: r, menuOpen, onMenuToggle, onToggleStatus, onEditSub, onDelete }) {
  const sub        = r.subscription
  const isExpired  = sub?.expires_at && new Date(sub.expires_at) < new Date()
  const isExpiring = sub?.expires_at && !isExpired && (new Date(sub.expires_at) - new Date()) < 7 * 86400 * 1000
  const btnRef     = useRef(null)

  // Position du dropdown calculée par rapport au bouton (fixed = échappe tout overflow)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  useEffect(() => {
    if (menuOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
  }, [menuOpen])

  // Fermer en cliquant ailleurs
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => {
      if (!btnRef.current?.contains(e.target)) onMenuToggle()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen, onMenuToggle])

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <p className="font-semibold text-gray-900">{r.name}</p>
        <p className="text-xs text-gray-400">{r.slug}</p>
      </td>
      <td className="px-4 py-3 text-gray-600">
        <p className="text-xs">{r.email}</p>
        {r.phone && <p className="text-xs text-gray-400">{r.phone}</p>}
      </td>
      <td className="px-4 py-3">
        <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full', planColor(sub?.plan))}>
          {planLabel(sub?.plan ?? 'free')}
        </span>
      </td>
      <td className="px-4 py-3">
        {r.is_active ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Actif
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Suspendu
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-xs">
        {!sub?.expires_at ? (
          <span className="text-gray-400">Illimité</span>
        ) : isExpired ? (
          <span className="text-red-600 font-semibold">Expiré</span>
        ) : isExpiring ? (
          <span className="text-amber-600 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {new Date(sub.expires_at).toLocaleDateString('fr-FR')}
          </span>
        ) : (
          <span className="text-gray-600">{new Date(sub.expires_at).toLocaleDateString('fr-FR')}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <Users className="w-3 h-3" /> {r.users_count}
        </span>
      </td>
      <td className="px-4 py-3">
        <button ref={btnRef} onClick={onMenuToggle}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <MoreVertical className="w-4 h-4 text-gray-400" />
        </button>
        {menuOpen && createPortal(
          <div
            style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
            className="bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-44"
          >
            <button onClick={onToggleStatus}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
              {r.is_active
                ? <><XCircle className="w-4 h-4 text-red-500" /> Suspendre</>
                : <><CheckCircle className="w-4 h-4 text-green-500" /> Activer</>
              }
            </button>
            <button onClick={onEditSub}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-blue-500" /> Abonnement
            </button>
            <div className="border-t border-gray-100 my-1" />
            <button onClick={onDelete}
              className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Supprimer
            </button>
          </div>,
          document.body
        )}
      </td>
    </tr>
  )
}
