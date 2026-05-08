import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  LogOut, Building2, Plus, Search, RefreshCw, CheckCircle,
  XCircle, AlertTriangle, Users, ShieldCheck,
  Edit3, Trash2, MoreVertical, KeyRound, Settings,
  TrendingUp, DollarSign, Clock, Eye, EyeOff,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { logout } from '../../api/auth'
import {
  platformGetStats, platformGetRestaurants, platformCreateRestaurant,
  platformToggleStatus, platformUpdateSubscription, platformDeleteRestaurant,
  platformGetSettings, platformUpdateSettings,
  platformListViewers, platformCreateViewer, platformDeleteViewer,
} from '../../api/platform'
import { useAuthStore } from '../../store/authStore'
import Modal from '../../components/common/Modal'
import ChangePasswordModal from '../../components/common/ChangePasswordModal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import clsx from 'clsx'

const SUB_STATUSES = [
  { key: 'trial',     label: 'Essai',    color: 'bg-blue-100 text-blue-700' },
  { key: 'active',    label: 'Actif',    color: 'bg-green-100 text-green-700' },
  { key: 'expired',   label: 'Expiré',   color: 'bg-red-100 text-red-700' },
  { key: 'cancelled', label: 'Annulé',   color: 'bg-gray-100 text-gray-600' },
]

const statusColor = (s) => SUB_STATUSES.find(x => x.key === s)?.color ?? 'bg-gray-100 text-gray-600'
const statusLabel = (s) => SUB_STATUSES.find(x => x.key === s)?.label ?? s

export default function PlatformDashboard() {
  const { user, clearAuth } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'

  // ── State ─────────────────────────────────────────────────────────────────
  const [stats, setStats]               = useState(null)
  const [restaurants, setRestaurants]   = useState([])
  const [meta, setMeta]                 = useState({ total: 0 })
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage]                 = useState(1)

  // Modals
  const [createModal, setCreateModal]     = useState(false)
  const [subModal, setSubModal]           = useState(null)
  const [deleteModal, setDeleteModal]     = useState(null)
  const [pwdModal, setPwdModal]           = useState(false)
  const [settingsModal, setSettingsModal] = useState(false)
  const [viewersModal, setViewersModal]   = useState(false)
  const [saving, setSaving]               = useState(false)
  const [menuOpen, setMenuOpen]           = useState(null)

  // Platform settings
  const [platformSettings, setPlatformSettings] = useState({
    subscription_price: 0, subscription_currency: 'FCFA', trial_days: 30, platform_name: 'RestoQR',
  })
  const [settingsForm, setSettingsForm] = useState(platformSettings)

  // Viewers
  const [viewers, setViewers]         = useState([])
  const [viewerForm, setViewerForm]   = useState({ name: '', email: '', password: '' })
  const [showViewerPwd, setShowViewerPwd] = useState(false)

  // Create restaurant form
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', currency: 'FCFA', timezone: 'Africa/Dakar',
    plan: 'standard', admin_name: '', admin_email: '', admin_password: '',
  })

  // Subscription form
  const [subForm, setSubForm] = useState({ status: 'active', expires_at: '' })

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

  const loadSettings = useCallback(async () => {
    try {
      const { data } = await platformGetSettings()
      setPlatformSettings(data)
      setSettingsForm(data)
    } catch {}
  }, [])

  const loadViewers = useCallback(async () => {
    try { const { data } = await platformListViewers(); setViewers(data) } catch {}
  }, [])

  useEffect(() => { loadStats() },        [loadStats])
  useEffect(() => { loadRestaurants() },  [loadRestaurants])
  useEffect(() => { loadSettings() },     [loadSettings])
  useEffect(() => {
    if (isSuperAdmin) loadViewers()
  }, [isSuperAdmin, loadViewers])

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await platformCreateRestaurant(form)
      toast.success('Restaurant créé !')
      setCreateModal(false)
      setForm({ name:'', email:'', phone:'', address:'', currency:'FCFA', timezone:'Africa/Dakar', plan:'standard', admin_name:'', admin_email:'', admin_password:'' })
      await Promise.all([loadStats(), loadRestaurants()])
    } catch (err) {
      const errors = err.response?.data?.errors
      toast.error(errors ? Object.values(errors)[0][0] : err.response?.data?.message || 'Erreur')
    } finally { setSaving(false) }
  }

  async function handleToggleStatus(restaurant) {
    setMenuOpen(null)
    try {
      await platformToggleStatus(restaurant.id)
      toast.success(restaurant.is_active ? 'Restaurant suspendu' : 'Restaurant activé')
      await Promise.all([loadStats(), loadRestaurants()])
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur') }
  }

  async function handleUpdateSub(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await platformUpdateSubscription(subModal.id, subForm)
      toast.success('Abonnement mis à jour')
      setSubModal(null)
      await loadRestaurants()
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur') }
    finally { setSaving(false) }
  }

  async function handleSaveSettings(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await platformUpdateSettings(settingsForm)
      setPlatformSettings(settingsForm)
      toast.success('Paramètres enregistrés')
      setSettingsModal(false)
      await loadStats()
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur') }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await platformDeleteRestaurant(deleteModal.id)
      toast.success('Restaurant supprimé')
      setDeleteModal(null)
      await Promise.all([loadStats(), loadRestaurants()])
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur') }
    finally { setSaving(false) }
  }

  async function handleCreateViewer(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await platformCreateViewer(viewerForm)
      toast.success('Accès créé !')
      setViewerForm({ name: '', email: '', password: '' })
      await loadViewers()
    } catch (err) {
      const errors = err.response?.data?.errors
      toast.error(errors ? Object.values(errors)[0][0] : err.response?.data?.message || 'Erreur')
    } finally { setSaving(false) }
  }

  async function handleDeleteViewer(id, name) {
    if (!confirm(`Supprimer l'accès de ${name} ?`)) return
    try {
      await platformDeleteViewer(id)
      toast.success('Accès supprimé')
      await loadViewers()
    } catch { toast.error('Erreur') }
  }

  async function handleLogout() {
    await logout().catch(() => {})
    clearAuth()
    window.location.href = '/login'
  }

  const fmtPrice = (amount) =>
    amount > 0 ? `${Number(amount).toLocaleString('fr-FR')} ${stats?.currency ?? platformSettings.subscription_currency}` : '—'

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
                <h1 className="font-bold text-gray-900 text-lg">{platformSettings.platform_name} — Plateforme</h1>
                <p className="text-xs text-gray-500">
                  {isSuperAdmin ? 'Super Admin' : 'Observateur'} · {user?.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => Promise.all([loadStats(), loadRestaurants()])}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Actualiser">
                <RefreshCw className="w-4 h-4 text-gray-400" />
              </button>
              {isSuperAdmin && <>
                <button onClick={() => { setSettingsForm(platformSettings); setSettingsModal(true) }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Paramètres plateforme">
                  <Settings className="w-4 h-4 text-gray-400" />
                </button>
                <button onClick={() => setViewersModal(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Gérer les accès">
                  <Eye className="w-4 h-4 text-gray-400" />
                </button>
              </>}
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

        {/* ── KPI — Restaurants ──────────────────────────────────────────────── */}
        {stats && (<>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total restaurants" value={stats.total}          icon={<Building2 className="w-5 h-5"/>}      color="bg-blue-500" />
            <StatCard label="Actifs"             value={stats.active}        icon={<CheckCircle className="w-5 h-5"/>}    color="bg-green-500" />
            <StatCard label="En essai"           value={stats.trial}         icon={<Clock className="w-5 h-5"/>}          color="bg-indigo-500" />
            <StatCard label="Suspendus"          value={stats.suspended}     icon={<XCircle className="w-5 h-5"/>}        color="bg-red-500" />
          </div>

          {/* ── KPI — Revenus ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-primary-500 to-orange-500 rounded-2xl p-5 text-white shadow-sm">
              <div className="flex items-center gap-2 mb-3 opacity-80">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">MRR (revenus mensuels)</span>
              </div>
              <p className="text-3xl font-black">{fmtPrice(stats.mrr)}</p>
              <p className="text-xs opacity-70 mt-1">{stats.active} abonnement{stats.active !== 1 ? 's' : ''} actif{stats.active !== 1 ? 's' : ''} × {fmtPrice(platformSettings.subscription_price)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-gray-400">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nouveaux ce mois</span>
              </div>
              <p className="text-3xl font-black text-gray-900">{fmtPrice(stats.revenue_this_month)}</p>
              <p className="text-xs text-gray-400 mt-1">{stats.new_this_month} nouveau{stats.new_this_month !== 1 ? 'x' : ''} restaurant{stats.new_this_month !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-gray-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Expirent sous 7 jours</span>
              </div>
              <p className="text-3xl font-black text-amber-500">{stats.expiring_soon}</p>
              <p className="text-xs text-gray-400 mt-1">À renouveler rapidement</p>
            </div>
          </div>
        </>)}

        {/* ── Plan banner (super_admin seulement) ────────────────────────────── */}
        {isSuperAdmin && (
          <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-primary-500 mt-0.5 shrink-0" />
              <div className="text-sm text-primary-800">
                <p className="font-semibold mb-0.5">Plan tarifaire — {platformSettings.platform_name}</p>
                <p className="text-primary-600">
                  {platformSettings.subscription_price > 0
                    ? `${Number(platformSettings.subscription_price).toLocaleString('fr-FR')} ${platformSettings.subscription_currency}/mois`
                    : 'Gratuit'
                  }
                  {platformSettings.trial_days > 0 && ` · ${platformSettings.trial_days} jours d'essai`}
                </p>
              </div>
            </div>
            <button onClick={() => { setSettingsForm(platformSettings); setSettingsModal(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-600 bg-white border border-primary-300 rounded-xl hover:bg-primary-50 transition-colors shrink-0">
              <Settings className="w-3.5 h-3.5" /> Modifier
            </button>
          </div>
        )}

        {/* ── Restaurants table ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary-500" />
              Restaurants ({meta.total})
            </h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Rechercher…" className="input pl-9 text-sm"
                  value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
              </div>
              <select className="input text-sm w-36" value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
                <option value="">Tous</option>
                <option value="active">Actifs</option>
                <option value="suspended">Suspendus</option>
              </select>
              {isSuperAdmin && (
                <button onClick={() => setCreateModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors shrink-0">
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              )}
            </div>
          </div>

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
                    <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Abonnement</th>
                    <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Statut</th>
                    <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Expiration</th>
                    <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Utilisateurs</th>
                    {isSuperAdmin && <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {restaurants.map(r => (
                    <RestaurantRow
                      key={r.id}
                      restaurant={r}
                      isSuperAdmin={isSuperAdmin}
                      menuOpen={menuOpen === r.id}
                      onMenuToggle={() => setMenuOpen(menuOpen === r.id ? null : r.id)}
                      onToggleStatus={() => handleToggleStatus(r)}
                      onEditSub={() => {
                        setMenuOpen(null)
                        setSubForm({
                          status: r.subscription?.status ?? 'trial',
                          expires_at: r.subscription?.expires_at?.substring(0,10) ?? '',
                        })
                        setSubModal(r)
                      }}
                      onDelete={() => { setMenuOpen(null); setDeleteModal(r) }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

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
          MODAL: Platform settings
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal open={settingsModal} onClose={() => setSettingsModal(false)} title="Paramètres de la plateforme">
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de la plateforme</label>
            <input className="input" required value={settingsForm.platform_name}
              onChange={e => setSettingsForm({...settingsForm, platform_name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Prix mensuel</label>
              <input type="number" min="0" step="500" className="input" required value={settingsForm.subscription_price}
                onChange={e => setSettingsForm({...settingsForm, subscription_price: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Devise</label>
              <select className="input" value={settingsForm.subscription_currency}
                onChange={e => setSettingsForm({...settingsForm, subscription_currency: e.target.value})}>
                <option value="FCFA">FCFA</option>
                <option value="XOF">XOF</option>
                <option value="XAF">XAF</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="MAD">MAD</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Jours d'essai gratuit</label>
            <input type="number" min="0" max="365" className="input" required value={settingsForm.trial_days}
              onChange={e => setSettingsForm({...settingsForm, trial_days: e.target.value})} />
            <p className="text-xs text-gray-400 mt-1">Mettre 0 pour désactiver la période d'essai.</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            Ces paramètres s'appliquent aux nouvelles inscriptions. Les abonnements existants ne sont pas affectés automatiquement.
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setSettingsModal(false)}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
              {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Viewers management
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal open={viewersModal} onClose={() => setViewersModal(false)} title="Accès observateurs">
        <div className="space-y-5">
          {/* Liste */}
          {viewers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Aucun observateur pour l'instant.</p>
          ) : (
            <div className="space-y-2">
              {viewers.map(v => (
                <div key={v.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{v.name}</p>
                    <p className="text-xs text-gray-400">{v.email}</p>
                  </div>
                  <button onClick={() => handleDeleteViewer(v.id, v.name)}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Créer */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Ajouter un observateur</p>
            <form onSubmit={handleCreateViewer} className="space-y-2">
              <input className="input" placeholder="Nom complet *" required
                value={viewerForm.name} onChange={e => setViewerForm({...viewerForm, name: e.target.value})} />
              <input type="email" className="input" placeholder="Email *" required
                value={viewerForm.email} onChange={e => setViewerForm({...viewerForm, email: e.target.value})} />
              <div className="relative">
                <input type={showViewerPwd ? 'text' : 'password'} className="input pr-10"
                  placeholder="Mot de passe (8 car. min) *" required minLength={8}
                  value={viewerForm.password} onChange={e => setViewerForm({...viewerForm, password: e.target.value})} />
                <button type="button" onClick={() => setShowViewerPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showViewerPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button type="submit" disabled={saving}
                className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <><Plus className="w-4 h-4" /> Créer l'accès</>}
              </button>
            </form>
          </div>
        </div>
      </Modal>

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
                  <option value="XAF">XAF</option>
                  <option value="MAD">MAD</option>
                </select>
              </div>
              <textarea className="input resize-none" rows={2} placeholder="Adresse"
                value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            </div>
          </fieldset>

          <div className="bg-primary-50 border border-primary-200 rounded-xl p-3 text-sm">
            <p className="font-semibold text-primary-800 mb-0.5">Plan standard</p>
            <p className="text-primary-600 text-xs">
              {platformSettings.subscription_price > 0
                ? `${Number(platformSettings.subscription_price).toLocaleString('fr-FR')} ${platformSettings.subscription_currency}/mois`
                : 'Gratuit'
              }
              {platformSettings.trial_days > 0 && ` · ${platformSettings.trial_days} jours d'essai`}
            </p>
          </div>

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
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Annuler</button>
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
            <p className="text-sm font-medium text-gray-700 mb-2">Statut</p>
            <div className="grid grid-cols-2 gap-2">
              {SUB_STATUSES.map(s => (
                <button key={s.key} type="button" onClick={() => setSubForm({...subForm, status: s.key})}
                  className={clsx(
                    'py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors',
                    subForm.status === s.key ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-gray-200 text-gray-600'
                  )}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date d'expiration</label>
            <input type="date" className="input" value={subForm.expires_at}
              onChange={e => setSubForm({...subForm, expires_at: e.target.value})} />
            <p className="text-xs text-gray-400 mt-1">Laisser vide pour un accès illimité.</p>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setSubModal(null)}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Annuler</button>
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
            <p className="font-semibold mb-1">Action irréversible</p>
            <p>Le restaurant <strong>{deleteModal?.name}</strong> et tous ses utilisateurs seront désactivés et archivés.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setDeleteModal(null)}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Annuler</button>
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

function RestaurantRow({ restaurant: r, isSuperAdmin, menuOpen, onMenuToggle, onToggleStatus, onEditSub, onDelete }) {
  const sub        = r.subscription
  const isExpired  = sub?.expires_at && new Date(sub.expires_at) < new Date()
  const isExpiring = sub?.expires_at && !isExpired && (new Date(sub.expires_at) - new Date()) < 7 * 86400 * 1000
  const btnRef     = useRef(null)

  const [pos, setPos] = useState({ top: 0, right: 0 })
  useEffect(() => {
    if (menuOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => { if (!btnRef.current?.contains(e.target)) onMenuToggle() }
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
        <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full', statusColor(sub?.status))}>
          {statusLabel(sub?.status ?? 'trial')}
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
      {isSuperAdmin && (
        <td className="px-4 py-3">
          <button ref={btnRef} onClick={onMenuToggle}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
          {menuOpen && createPortal(
            <div style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
              className="bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-44">
              <button onMouseDown={(e) => { e.stopPropagation(); onToggleStatus() }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                {r.is_active
                  ? <><XCircle className="w-4 h-4 text-red-500" /> Suspendre</>
                  : <><CheckCircle className="w-4 h-4 text-green-500" /> Activer</>
                }
              </button>
              <button onMouseDown={(e) => { e.stopPropagation(); onEditSub() }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-500" /> Abonnement
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button onMouseDown={(e) => { e.stopPropagation(); onDelete() }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Supprimer
              </button>
            </div>,
            document.body
          )}
        </td>
      )}
    </tr>
  )
}
