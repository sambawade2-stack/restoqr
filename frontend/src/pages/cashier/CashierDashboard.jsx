import { useState, useCallback, useEffect } from 'react'
import {
  LogOut, CreditCard, RefreshCw, Receipt, Plus, Minus,
  ShoppingCart, X, TrendingUp, ClipboardList, CheckCircle, Clock, KeyRound,
  PlayCircle, StopCircle, History, ChevronLeft, ChevronRight, Search, Printer,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getActiveOrders, cashierUpdateStatus, cashierProcessPayment } from '../../api/orders'
import { cashierGetStats, cashierGetTables, cashierGetCategories, cashierGetProducts, cashierCreateOrder } from '../../api/cashier'
import { getCurrentShift, openShift, closeShift, getShiftHistory, getCashierHistory } from '../../api/shifts'
import { logout } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import { usePolling } from '../../hooks/usePolling'
import { formatCurrency, formatDate } from '../../utils/format'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ChangePasswordModal from '../../components/common/ChangePasswordModal'
import PrintReceipt from '../../components/common/PrintReceipt'
import clsx from 'clsx'

const ORDER_TYPES = [
  { key: 'dine_in',  label: 'Sur place',  icon: '🪑' },
  { key: 'takeaway', label: 'À emporter', icon: '🥡' },
  { key: 'delivery', label: 'Livraison',  icon: '🛵' },
]
const TYPE_LABELS = { dine_in: 'Table', delivery: 'Livraison', takeaway: 'Emporter' }
const TYPE_COLORS = {
  dine_in:  'bg-blue-100 text-blue-700',
  delivery: 'bg-purple-100 text-purple-700',
  takeaway: 'bg-amber-100 text-amber-700',
}

export default function CashierDashboard() {
  const { user, clearAuth } = useAuthStore()
  const [tab, setTab]           = useState('dashboard') // 'dashboard' | 'orders' | 'new'
  const [pwdModal, setPwdModal] = useState(false)

  // ── Shift (caisse) ────────────────────────────────────────────────────────
  const [shift, setShift]               = useState(undefined) // undefined=loading, null=fermée, obj=ouverte
  const [shiftLoading, setShiftLoading] = useState(false)
  const [closeModal, setCloseModal]     = useState(false)
  const [closeNotes, setCloseNotes]     = useState('')
  const [historyModal, setHistoryModal] = useState(false)
  const [history, setHistory]           = useState([])

  // ── Stats ─────────────────────────────────────────────────────────────────
  const [stats, setStats]     = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // ── Active orders ─────────────────────────────────────────────────────────
  const [orders, setOrders]     = useState([])
  const [ordLoading, setOrdLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [payModal, setPayModal] = useState(false)
  const [payMethod, setPayMethod] = useState('cash')
  const [saving, setSaving]     = useState(false)
  const [paidOrder, setPaidOrder] = useState(null) // commande après paiement → impression

  // ── Historique ────────────────────────────────────────────────────────────
  const todayStr = () => new Date().toISOString().split('T')[0]
  const [histDate, setHistDate]       = useState(todayStr())
  const [histData, setHistData]       = useState(null)
  const [histLoading, setHistLoading] = useState(false)
  const [histSearch, setHistSearch]   = useState('')
  const [histExpanded, setHistExpanded] = useState(null)

  // ── New order ─────────────────────────────────────────────────────────────
  const [tables, setTables]         = useState([])
  const [categories, setCategories] = useState([])
  const [products, setProducts]     = useState([])
  const [menuLoading, setMenuLoading] = useState(true)
  const [activeCat, setActiveCat]   = useState(null)
  const [orderType, setOrderType]   = useState('dine_in')
  const [tableId, setTableId]       = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryAddr, setDeliveryAddr] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [cart, setCart]             = useState([])
  const [submitting, setSubmitting] = useState(false)

  // ── Shift fetching ────────────────────────────────────────────────────────
  const fetchShift = useCallback(async () => {
    try {
      const { data } = await getCurrentShift()
      setShift(prev => prev === undefined ? (data.shift ?? null) : (data.shift ?? null))
    } catch { setShift(null) }
  }, [])

  useEffect(() => { fetchShift() }, [])
  usePolling(fetchShift, 5_000)

  async function handleOpenShift() {
    setShiftLoading(true)
    try {
      const { data } = await openShift()
      setShift(data.shift)
      toast.success('Caisse ouverte !')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally { setShiftLoading(false) }
  }

  async function handleCloseShift() {
    setShiftLoading(true)
    try {
      const { data } = await closeShift(closeNotes)
      setShift(null)
      setCloseModal(false)
      setCloseNotes('')
      toast.success(`Caisse clôturée — ${formatCurrency(data.shift.total_revenue)} encaissés`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally { setShiftLoading(false) }
  }

  async function handleShowHistory() {
    const { data } = await getShiftHistory().catch(() => ({ data: [] }))
    setHistory(data)
    setHistoryModal(true)
  }

  async function loadHistory(date) {
    setHistLoading(true)
    setHistExpanded(null)
    try {
      const { data } = await getCashierHistory(date)
      setHistData(data)
    } catch { toast.error('Erreur chargement historique') }
    finally { setHistLoading(false) }
  }

  function shiftDate(days) {
    const d = new Date(histDate)
    d.setDate(d.getDate() + days)
    const s = d.toISOString().split('T')[0]
    if (s <= todayStr()) setHistDate(s)
  }

  useEffect(() => {
    if (tab === 'history') loadHistory(histDate)
  }, [tab, histDate])

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await getActiveOrders()
      setOrders(data)
    } catch {}
    finally { setOrdLoading(false) }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await cashierGetStats()
      setStats(data)
    } catch {}
    finally { setStatsLoading(false) }
  }, [])

  async function refreshAll() {
    await Promise.all([fetchOrders(), fetchStats()])
  }

  usePolling(fetchOrders, 3_000, true, true)
  usePolling(fetchStats,  10_000, true, true)

  useEffect(() => {
    async function loadMenu() {
      try {
        const [tabRes, catRes, prodRes] = await Promise.all([
          cashierGetTables(), cashierGetCategories(), cashierGetProducts(),
        ])
        setTables(tabRes.data)
        setCategories(catRes.data)
        setProducts(prodRes.data)
        if (catRes.data.length > 0) setActiveCat(catRes.data[0].id)
      } catch {}
      finally { setMenuLoading(false) }
    }
    loadMenu()
  }, [])

  // ── Handlers: orders ──────────────────────────────────────────────────────
  async function handleStatus(order, next) {
    setSaving(true)
    try {
      await cashierUpdateStatus(order.id, next)
      toast.success('Statut mis à jour')
      await fetchOrders()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally { setSaving(false) }
  }

  async function handlePayment() {
    if (!selected) return
    setSaving(true)
    try {
      await cashierProcessPayment(selected.id, { method: payMethod })
      toast.success('Paiement enregistré !')
      setPaidOrder({ ...selected, payment: { method: payMethod } })
      setPayModal(false)
      setSelected(null)
      await refreshAll()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally { setSaving(false) }
  }

  // ── Handlers: cart ────────────────────────────────────────────────────────
  function addToCart(product) {
    setCart(prev => {
      const idx = prev.findIndex(i => i.product.id === product.id)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = { ...updated[idx], qty: updated[idx].qty + 1 }
        return updated
      }
      return [...prev, { product, qty: 1 }]
    })
  }

  function updateQty(productId, delta) {
    setCart(prev => prev
      .map(i => i.product.id === productId ? { ...i, qty: i.qty + delta } : i)
      .filter(i => i.qty > 0)
    )
  }

  function removeFromCart(productId) {
    setCart(prev => prev.filter(i => i.product.id !== productId))
  }

  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0)

  async function handleSubmitOrder() {
    if (cart.length === 0) { toast.error('Ajoutez des articles au panier.'); return }
    if (orderType === 'dine_in' && !tableId) { toast.error('Sélectionnez une table.'); return }
    if (orderType === 'delivery' && !deliveryAddr) { toast.error("Adresse de livraison requise."); return }

    setSubmitting(true)
    try {
      await cashierCreateOrder({
        type:             orderType,
        table_id:         orderType === 'dine_in' ? tableId : null,
        customer_name:    customerName || null,
        customer_phone:   customerPhone || null,
        delivery_address: orderType === 'delivery' ? deliveryAddr : null,
        notes:            orderNotes || null,
        items: cart.map(i => ({ product_id: i.product.id, quantity: i.qty })),
      })
      toast.success('Commande créée !')
      setCart([]); setTableId(''); setCustomerName(''); setCustomerPhone('')
      setDeliveryAddr(''); setOrderNotes(''); setOrderType('dine_in')
      setTab('orders')
      await refreshAll()
    } catch (err) {
      const msg = err.response?.data?.message
        || Object.values(err.response?.data?.errors || {})[0]?.[0]
        || 'Erreur lors de la création.'
      toast.error(msg)
    } finally { setSubmitting(false) }
  }

  async function handleLogout() {
    await logout().catch(() => {})
    clearAuth()
    window.location.href = '/login'
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const toServe    = orders.filter(o => o.status === 'ready')
  const toEncaisse = orders.filter(o => o.status === 'served')
  const inProgress = orders.filter(o => !['ready', 'served'].includes(o.status))
  const urgentCount = toServe.length + toEncaisse.length
  const filteredProducts = activeCat
    ? products.filter(p => p.category_id === activeCat && p.is_available)
    : products.filter(p => p.is_available)

  // ── Tabs config ───────────────────────────────────────────────────────────
  const TABS = [
    { key: 'dashboard', label: 'Tableau de Bord',  icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'orders',    label: 'Commandes',         icon: <ClipboardList className="w-4 h-4" />, badge: urgentCount },
    { key: 'new',       label: 'Nouvelle Commande', icon: <Plus className="w-4 h-4" />, highlight: true },
    { key: 'history',   label: 'Historique',        icon: <History className="w-4 h-4" /> },
  ]

  // ── Impression rapport journalier ─────────────────────────────────────────
  function printDailyReport(data, date, restaurant) {
    const dateLabel = new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    const rows = data.orders.map(o => `
      <tr>
        <td>${o.order_number}</td>
        <td>${o.table?.name ?? o.customer_name ?? '—'}</td>
        <td>${{ dine_in: 'Sur place', takeaway: 'Emporter', delivery: 'Livraison' }[o.type] ?? o.type}</td>
        <td style="text-align:right">${formatCurrency(o.total)}</td>
        <td>${o.status === 'paid' ? '✓' : o.status}</td>
      </tr>`).join('')

    const win = window.open('', '_blank', 'width=700,height=900')
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <title>Rapport ${date}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; color: #000; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      h2 { font-size: 13px; color: #555; margin-bottom: 16px; font-weight: normal; }
      .summary { display: flex; gap: 20px; margin-bottom: 20px; }
      .kpi { border: 1px solid #ddd; border-radius: 8px; padding: 10px 16px; text-align: center; }
      .kpi .val { font-size: 22px; font-weight: bold; }
      .kpi .lbl { font-size: 11px; color: #666; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th { background: #f3f4f6; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
      td { padding: 7px 8px; border-bottom: 1px solid #f0f0f0; font-size: 12px; }
      tr:last-child td { border-bottom: none; }
      .footer { margin-top: 20px; text-align: center; color: #999; font-size: 10px; }
      @media print { @page { margin: 15mm; } }
    </style></head><body>
    <h1>${restaurant?.name ?? 'Restaurant'}</h1>
    <h2>Rapport journalier — ${dateLabel}</h2>
    <div class="summary">
      <div class="kpi"><div class="val">${data.summary.total_orders}</div><div class="lbl">Commandes</div></div>
      <div class="kpi"><div class="val">${data.summary.paid_orders}</div><div class="lbl">Payées</div></div>
      <div class="kpi"><div class="val" style="color:#f97316">${formatCurrency(data.summary.total_revenue)}</div><div class="lbl">Recettes</div></div>
    </div>
    <table>
      <thead><tr><th>N° Commande</th><th>Table / Client</th><th>Type</th><th style="text-align:right">Montant</th><th>Statut</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">Généré le ${new Date().toLocaleString('fr-FR')} — RestoQR</div>
    <script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script>
    </body></html>`)
    win.document.close()
  }

  // ── Shift gate : caisse fermée ────────────────────────────────────────────
  if (shift === undefined) return <LoadingSpinner size="lg" className="min-h-screen" />

  if (shift === null) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6 p-6">
      <div className="w-20 h-20 bg-primary-500 rounded-3xl flex items-center justify-center shadow-lg">
        <Receipt className="w-10 h-10 text-white" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Caisse fermée</h1>
        <p className="text-gray-500 mt-1">Démarrez une session pour commencer à encaisser</p>
      </div>
      <button
        onClick={handleOpenShift}
        disabled={shiftLoading}
        className="flex items-center gap-3 bg-primary-500 hover:bg-primary-600 text-white font-bold px-8 py-4 rounded-2xl text-lg shadow-lg transition-colors disabled:opacity-60"
      >
        <PlayCircle className="w-6 h-6" />
        {shiftLoading ? 'Ouverture...' : 'Démarrer la caisse'}
      </button>
      <button onClick={handleShowHistory} className="text-gray-400 hover:text-gray-600 flex items-center gap-2 text-sm">
        <History className="w-4 h-4" /> Voir l'historique des sessions
      </button>
      <button onClick={() => { logout().catch(() => {}); clearAuth(); window.location.href = '/login' }}
        className="text-gray-400 hover:text-gray-600 flex items-center gap-2 text-sm">
        <LogOut className="w-4 h-4" /> Déconnexion
      </button>

      {/* Historique modal */}
      <Modal open={historyModal} onClose={() => setHistoryModal(false)} title="Historique des sessions">
        {history.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Aucune session enregistrée</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {history.map(s => (
              <div key={s.id} className="border border-gray-100 rounded-xl p-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">{s.opened_by?.name}</span>
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',
                    s.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  )}>{s.status === 'open' ? 'En cours' : 'Clôturée'}</span>
                </div>
                <div className="text-gray-400 mt-1">
                  Ouverture : {formatDate(s.opened_at)}
                  {s.closed_at && <> · Clôture : {formatDate(s.closed_at)}</>}
                </div>
                <div className="flex gap-4 mt-2 font-semibold">
                  <span className="text-green-600">{formatCurrency(s.total_revenue)}</span>
                  <span className="text-gray-500">{s.total_orders} commandes</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Caisse</h1>
              <p className="text-gray-500 text-xs">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Infos session en cours */}
            {shift && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 mr-2">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                Session depuis {formatDate(shift.opened_at)}
              </div>
            )}
            <button onClick={refreshAll} className="p-2 hover:bg-gray-100 rounded-lg" title="Actualiser">
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={() => setPwdModal(true)} className="p-2 hover:bg-gray-100 rounded-lg" title="Changer le mot de passe">
              <KeyRound className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={() => setCloseModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-lg text-sm transition-colors"
              title="Clôturer la caisse"
            >
              <StopCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Clôturer</span>
            </button>
            <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-lg">
              <LogOut className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <nav className="flex gap-1 mt-3 overflow-x-auto pb-0.5">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={clsx(
                'shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap',
                tab === t.key
                  ? t.highlight ? 'bg-primary-500 text-white' : 'bg-gray-900 text-white'
                  : t.highlight
                    ? 'bg-primary-50 text-primary-600 hover:bg-primary-100 border border-primary-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              )}>
              {t.icon}
              {t.label}
              {t.badge > 0 && (
                <span className={clsx(
                  'text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold',
                  tab === t.key ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
                )}>{t.badge}</span>
              )}
            </button>
          ))}
        </nav>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: DASHBOARD
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'dashboard' && (
        <div className="flex-1 p-4 space-y-5 overflow-y-auto">
          {statsLoading ? <LoadingSpinner size="lg" className="py-20" /> : stats && (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard
                  label="Commandes (session)"
                  value={shift?.total_orders ?? stats.today.orders}
                  icon={<ClipboardList className="w-5 h-5" />}
                  color="bg-blue-500"
                />
                <KpiCard
                  label="Encaissé (session)"
                  value={formatCurrency(shift?.total_revenue ?? stats.today.revenue)}
                  icon={<TrendingUp className="w-5 h-5" />}
                  color="bg-green-500"
                  large
                />
                <KpiCard
                  label="Commandes actives"
                  value={stats.today.active}
                  icon={<Clock className="w-5 h-5" />}
                  color="bg-orange-500"
                />
                <KpiCard
                  label="Livraisons"
                  value={stats.today.deliveries}
                  icon={<Receipt className="w-5 h-5" />}
                  color="bg-purple-500"
                />
              </div>

              {/* Active orders quick view */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Prêtes à servir', count: toServe.length,    color: 'border-green-400 bg-green-50', text: 'text-green-700' },
                  { label: 'À encaisser',      count: toEncaisse.length, color: 'border-green-400 bg-green-50', text: 'text-green-700' },
                  { label: 'En cuisine',        count: inProgress.length, color: 'border-gray-200 bg-gray-50',   text: 'text-gray-700' },
                ].map(s => (
                  <div key={s.label} className={clsx('rounded-2xl border-2 p-4 text-center cursor-pointer hover:shadow-sm transition-shadow', s.color)}
                    onClick={() => setTab('orders')}>
                    <p className={clsx('text-3xl font-bold', s.text)}>{s.count}</p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Top products */}
              {stats.top_products?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary-500" />
                    Top produits du jour
                  </h3>
                  <div className="space-y-2">
                    {stats.top_products.map((p, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 text-xs font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-gray-800">{p.name}</span>
                            <span className="text-gray-500">{p.total_qty} vendus</span>
                          </div>
                          <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-400 rounded-full"
                              style={{ width: `${Math.round((p.total_qty / stats.top_products[0].total_qty) * 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Weekly chart (simple bar) */}
              {stats.weekly_sales?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <h3 className="font-semibold text-gray-800 mb-4">Ventes — 7 derniers jours</h3>
                  <div className="flex items-end gap-2 h-24">
                    {stats.weekly_sales.map((day, i) => {
                      const maxRev = Math.max(...stats.weekly_sales.map(d => d.revenue), 1)
                      const pct = Math.max((day.revenue / maxRev) * 100, day.revenue > 0 ? 5 : 0)
                      const isToday = i === stats.weekly_sales.length - 1
                      return (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs text-gray-400">{day.orders > 0 ? day.orders : ''}</span>
                          <div className="w-full flex items-end justify-center" style={{ height: '64px' }}>
                            <div
                              className={clsx('w-full rounded-t-md transition-all', isToday ? 'bg-primary-500' : 'bg-gray-200')}
                              style={{ height: `${pct}%` }}
                              title={formatCurrency(day.revenue)}
                            />
                          </div>
                          <span className="text-xs text-gray-500 font-medium">{day.label}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-400">
                    <span>Total 7j :</span>
                    <span className="font-semibold text-gray-700">
                      {formatCurrency(stats.weekly_sales.reduce((s, d) => s + d.revenue, 0))}
                    </span>
                  </div>
                </div>
              )}

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setTab('orders')}
                  className="bg-white rounded-2xl border-2 border-gray-200 p-4 text-left hover:border-primary-300 hover:shadow-sm transition-all">
                  <ClipboardList className="w-6 h-6 text-primary-500 mb-2" />
                  <p className="font-semibold text-gray-800">Voir les commandes</p>
                  <p className="text-xs text-gray-400 mt-0.5">{orders.length} commande(s) active(s)</p>
                </button>
                <button onClick={() => setTab('new')}
                  className="bg-primary-500 rounded-2xl p-4 text-left hover:bg-primary-600 transition-colors">
                  <Plus className="w-6 h-6 text-white mb-2" />
                  <p className="font-semibold text-white">Nouvelle commande</p>
                  <p className="text-xs text-primary-100 mt-0.5">Sur place · À emporter · Livraison</p>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: ACTIVE ORDERS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'orders' && (
        <div className="flex-1 p-4 space-y-5 overflow-y-auto">
          {ordLoading ? <LoadingSpinner size="lg" className="py-20" /> : (
            <>
              {toServe.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Prêtes à servir
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {toServe.map(order => (
                      <OrderCard key={order.id} order={order} saving={saving} highlight
                        actionLabel={<><CheckCircle className="w-3.5 h-3.5" /> Marquer comme servie</>}
                        actionClass="bg-green-500 hover:bg-green-600 text-white"
                        onAction={() => handleStatus(order, 'served')}
                        onDetail={() => setSelected(order)} />
                    ))}
                  </div>
                </section>
              )}

              {toEncaisse.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> À encaisser
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {toEncaisse.map(order => (
                      <OrderCard key={order.id} order={order} saving={saving} highlight
                        actionLabel={<><CreditCard className="w-3.5 h-3.5" /> Encaisser</>}
                        actionClass="bg-green-600 hover:bg-green-700 text-white"
                        onAction={() => { setSelected(order); setPayModal(true) }}
                        onDetail={() => setSelected(order)} />
                    ))}
                  </div>
                </section>
              )}

              {inProgress.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">En cuisine</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {inProgress.map(order => (
                      <OrderCard key={order.id} order={order} onDetail={() => setSelected(order)} />
                    ))}
                  </div>
                </section>
              )}

              {orders.length === 0 && (
                <div className="text-center py-24">
                  <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">Aucune commande active</p>
                  <button onClick={() => setTab('new')}
                    className="mt-4 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                    Créer une commande
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: HISTORIQUE
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'history' && (
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">

          {/* Sélecteur date */}
          <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm flex items-center gap-2">
            <button onClick={() => shiftDate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <div className="flex-1 flex items-center justify-center gap-2">
              <History className="w-4 h-4 text-primary-500" />
              <span className="font-semibold text-gray-800 text-sm">
                {histDate === todayStr() ? "Aujourd'hui" : new Date(histDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
              <input type="date" value={histDate} max={todayStr()}
                onChange={e => e.target.value && setHistDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary-300" />
            </div>
            <button onClick={() => shiftDate(1)} disabled={histDate >= todayStr()} className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30">
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {histLoading ? <LoadingSpinner size="lg" className="py-20" /> : histData && (
            <>
              {/* Résumé + bouton impression */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center shadow-sm">
                  <p className="text-xl font-bold text-gray-800">{histData.summary.total_orders}</p>
                  <p className="text-xs text-gray-500">Commandes</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center shadow-sm">
                  <p className="text-xl font-bold text-green-600">{histData.summary.paid_orders}</p>
                  <p className="text-xs text-gray-500">Payées</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center shadow-sm">
                  <p className="text-base font-bold text-primary-600">{formatCurrency(histData.summary.total_revenue)}</p>
                  <p className="text-xs text-gray-500">Recettes</p>
                </div>
              </div>

              {/* Bouton imprimer le rapport */}
              <button onClick={() => printDailyReport(histData, histDate, user?.restaurant)}
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2 text-sm transition-colors">
                <Printer className="w-4 h-4" /> Imprimer le rapport du jour
              </button>

              {/* Recherche */}
              {histData.orders.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={histSearch} onChange={e => setHistSearch(e.target.value)}
                    placeholder="N° commande, table, client..."
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
                </div>
              )}

              {/* Liste commandes */}
              {histData.orders.filter(o =>
                !histSearch ||
                o.order_number?.toLowerCase().includes(histSearch.toLowerCase()) ||
                o.table?.name?.toLowerCase().includes(histSearch.toLowerCase()) ||
                o.customer_name?.toLowerCase().includes(histSearch.toLowerCase())
              ).length === 0 ? (
                <div className="text-center py-16">
                  <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">{histData.orders.length === 0 ? 'Aucune commande ce jour' : 'Aucun résultat'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {histData.orders
                    .filter(o =>
                      !histSearch ||
                      o.order_number?.toLowerCase().includes(histSearch.toLowerCase()) ||
                      o.table?.name?.toLowerCase().includes(histSearch.toLowerCase()) ||
                      o.customer_name?.toLowerCase().includes(histSearch.toLowerCase())
                    )
                    .map(order => (
                      <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <button
                          onClick={() => setHistExpanded(histExpanded === order.id ? null : order.id)}
                          className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-800 text-sm">{order.order_number}</span>
                              {order.table && <span className="text-xs text-gray-500">{order.table.name}</span>}
                              {order.customer_name && <span className="text-xs text-gray-500">👤 {order.customer_name}</span>}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.created_at)}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <StatusBadge status={order.status} size="sm" />
                            <span className="font-bold text-sm text-gray-800">{formatCurrency(order.total)}</span>
                          </div>
                        </button>
                        {histExpanded === order.id && (
                          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-2">
                            {order.items?.map(item => (
                              <div key={item.id} className="flex justify-between text-sm text-gray-700">
                                <span>{item.quantity}× {item.product?.name}</span>
                                <span className="font-medium">{formatCurrency(item.total_price)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between font-bold text-sm border-t border-gray-200 pt-2">
                              <span>Total</span>
                              <span className="text-primary-600">{formatCurrency(order.total)}</span>
                            </div>
                            {order.payment && (
                              <p className="text-xs text-gray-400">Réglé : {order.payment.method === 'cash' ? 'Espèces' : order.payment.method === 'card' ? 'Carte' : 'Mobile Money'}</p>
                            )}
                            {order.status === 'paid' && (
                              <button onClick={() => setPaidOrder({ ...order, payment: order.payment })}
                                className="w-full mt-1 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
                                <Printer className="w-3.5 h-3.5" /> Réimprimer le reçu
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: NEW ORDER  — single-column scrollable layout
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'new' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {menuLoading ? <LoadingSpinner size="lg" className="m-auto" /> : (
            <>
              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto pb-28">

                {/* ── Order type + customer info ─────────────────────────── */}
                <div className="bg-white border-b border-gray-100 p-4 space-y-3">
                  {/* Type selector */}
                  <div className="grid grid-cols-3 gap-2">
                    {ORDER_TYPES.map(t => (
                      <button key={t.key} onClick={() => setOrderType(t.key)}
                        className={clsx(
                          'py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors flex flex-col items-center gap-0.5',
                          orderType === t.key
                            ? 'border-primary-500 bg-primary-50 text-primary-600'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                        )}>
                        <span className="text-lg">{t.icon}</span>
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Table selector (dine-in only) */}
                  {orderType === 'dine_in' && (
                    <select value={tableId} onChange={e => setTableId(e.target.value)} className="input">
                      <option value="">— Sélectionner une table —</option>
                      {tables.map(t => (
                        <option key={t.id} value={t.id} disabled={t.status === 'occupied'}>
                          {t.name} {t.status === 'occupied' ? '(occupée)' : ''}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Customer info */}
                  <div className="grid grid-cols-2 gap-2">
                    <input className="input text-sm" placeholder="Nom client"
                      value={customerName} onChange={e => setCustomerName(e.target.value)} />
                    <input className="input text-sm" placeholder="Téléphone"
                      value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                  </div>

                  {orderType === 'delivery' && (
                    <input className="input text-sm" placeholder="Adresse de livraison *"
                      value={deliveryAddr} onChange={e => setDeliveryAddr(e.target.value)} />
                  )}

                  <textarea className="input text-sm resize-none" rows={2}
                    placeholder="Notes (allergies, demandes spéciales…)"
                    value={orderNotes} onChange={e => setOrderNotes(e.target.value)} />
                </div>

                {/* ── Category tabs (sticky) ─────────────────────────────── */}
                <div className="sticky top-0 z-10 flex gap-1 p-3 bg-white border-b border-gray-100 overflow-x-auto shadow-sm">
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => setActiveCat(cat.id)}
                      className={clsx(
                        'shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                        activeCat === cat.id ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}>
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* ── Products grid ──────────────────────────────────────── */}
                <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredProducts.map(prod => {
                    const inCart = cart.find(i => i.product.id === prod.id)
                    return (
                      <button key={prod.id} onClick={() => addToCart(prod)}
                        className={clsx(
                          'bg-white rounded-xl border-2 p-2 text-left transition-all active:scale-95 relative',
                          inCart ? 'border-primary-400 shadow-md' : 'border-gray-100 hover:border-primary-200 hover:shadow-sm'
                        )}>
                        {prod.image
                          ? <img src={prod.image} alt={prod.name} className="w-full h-24 object-cover rounded-lg mb-2" />
                          : <div className="w-full h-24 bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-3xl">🍽️</div>
                        }
                        <p className="text-xs font-semibold text-gray-800 truncate">{prod.name}</p>
                        <p className="text-xs text-primary-500 font-bold mt-0.5">{formatCurrency(prod.price)}</p>
                        {inCart && (
                          <span className="absolute top-1.5 right-1.5 bg-primary-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                            {inCart.qty}
                          </span>
                        )}
                      </button>
                    )
                  })}
                  {filteredProducts.length === 0 && (
                    <p className="col-span-full text-center text-gray-400 py-10 text-sm">Aucun produit disponible</p>
                  )}
                </div>

                {/* ── Cart recap (inline, shown when not empty) ──────────── */}
                {cart.length > 0 && (
                  <div className="mx-3 mb-3 bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4" /> Panier ({cart.reduce((s, i) => s + i.qty, 0)} article{cart.reduce((s, i) => s + i.qty, 0) > 1 ? 's' : ''})
                      </p>
                    </div>
                    <div className="p-3 space-y-2">
                      {cart.map(item => (
                        <div key={item.product.id} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{item.product.name}</p>
                            <p className="text-xs text-primary-500">{formatCurrency(item.product.price * item.qty)}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => updateQty(item.product.id, -1)}
                              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-sm font-bold">{item.qty}</span>
                            <button onClick={() => updateQty(item.product.id, +1)}
                              className="w-7 h-7 rounded-lg bg-primary-100 hover:bg-primary-200 text-primary-600 flex items-center justify-center">
                              <Plus className="w-3 h-3" />
                            </button>
                            <button onClick={() => removeFromCart(item.product.id)}
                              className="w-7 h-7 rounded-lg hover:bg-red-100 text-red-400 flex items-center justify-center">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Sticky bottom bar ──────────────────────────────────────── */}
              <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
                {cart.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 text-gray-400 py-1">
                    <ShoppingCart className="w-4 h-4" />
                    <span className="text-sm">Sélectionnez des produits ci-dessus</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">{cart.reduce((s, i) => s + i.qty, 0)} article(s)</p>
                      <p className="text-lg font-bold text-primary-500">{formatCurrency(cartTotal)}</p>
                    </div>
                    <button onClick={handleSubmitOrder} disabled={submitting}
                      className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                      {submitting
                        ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <><Receipt className="w-4 h-4" /> Envoyer en cuisine</>
                      }
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Order detail modal ──────────────────────────────────────────────── */}
      <Modal open={!!selected && !payModal} onClose={() => setSelected(null)}
        title={`Commande — ${selected?.table?.name || selected?.order_number}`}>
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <StatusBadge status={selected.status} size="md" />
              <span className="font-bold text-gray-900 text-lg">{formatCurrency(selected.total)}</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
              {selected.items?.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.quantity}× {item.product?.name}</span>
                  <span className="font-medium">{formatCurrency(item.total_price)}</span>
                </div>
              ))}
            </div>
            {selected.customer_name && (
              <p className="text-sm text-gray-600">👤 {selected.customer_name} {selected.customer_phone && `· ${selected.customer_phone}`}</p>
            )}
            {selected.notes && (
              <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 text-sm text-yellow-800">📝 {selected.notes}</div>
            )}
            {selected.status === 'served' && (
              <button onClick={() => setPayModal(true)}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                <CreditCard className="w-4 h-4" /> Encaisser
              </button>
            )}
          </div>
        )}
      </Modal>

      {/* ── Payment modal ───────────────────────────────────────────────────── */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Encaisser la commande">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-3 space-y-1">
            {selected?.items?.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.quantity}× {item.product?.name}</span>
                <span>{formatCurrency(item.total_price)}</span>
              </div>
            ))}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Moyen de paiement</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'cash',         label: 'Espèces' },
                { key: 'wave',         label: 'Wave' },
                { key: 'orange_money', label: 'Orange Money' },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setPayMethod(key)}
                  className={clsx(
                    'py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors',
                    payMethod === key
                      ? 'border-primary-500 bg-primary-50 text-primary-600'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  )}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between font-bold text-xl border-t border-gray-100 pt-3">
            <span>Total à encaisser</span>
            <span className="text-primary-500">{formatCurrency(selected?.total || 0)}</span>
          </div>
          <button onClick={handlePayment} disabled={saving}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
            {saving
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><CreditCard className="w-4 h-4" /> Confirmer le paiement</>
            }
          </button>
        </div>
      </Modal>

      <ChangePasswordModal open={pwdModal} onClose={() => setPwdModal(false)} />

      {/* ── Modal reçu après paiement ────────────────────────────────────────── */}
      <Modal open={!!paidOrder} onClose={() => setPaidOrder(null)} title="Paiement confirmé ✓">
        {paidOrder && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-green-700 font-bold text-lg">{formatCurrency(paidOrder.total)}</p>
              <p className="text-green-600 text-sm mt-0.5">Encaissé avec succès</p>
            </div>
            <PrintReceipt order={paidOrder} restaurant={user?.restaurant} />
            <button onClick={() => setPaidOrder(null)}
              className="w-full py-2.5 border border-gray-200 rounded-xl text-gray-600 font-semibold hover:bg-gray-50">
              Fermer
            </button>
          </div>
        )}
      </Modal>

      {/* ── Modal clôture caisse ─────────────────────────────────────────────── */}
      <Modal open={closeModal} onClose={() => setCloseModal(false)} title="Clôturer la caisse">
        <div className="space-y-5">
          {/* Résumé session */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Résumé de la session</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{formatCurrency(shift?.total_revenue ?? 0)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Recettes encaissées</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-800">{shift?.total_orders ?? 0}</p>
                <p className="text-xs text-gray-500 mt-0.5">Commandes traitées</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center">
              Session ouverte le {shift ? formatDate(shift.opened_at) : '—'}
            </p>
          </div>

          {/* Notes optionnelles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optionnel)</label>
            <textarea
              value={closeNotes}
              onChange={e => setCloseNotes(e.target.value)}
              placeholder="Observations, incidents, remarques..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setCloseModal(false)}
              className="flex-1 py-3 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button onClick={handleCloseShift} disabled={shiftLoading}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
              <StopCircle className="w-4 h-4" />
              {shiftLoading ? 'Clôture...' : 'Confirmer la clôture'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color, large }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0', color)}>
        {icon}
      </div>
      <div>
        <p className={clsx('font-bold text-gray-900', large ? 'text-lg' : 'text-2xl')}>{value}</p>
        <p className="text-xs text-gray-500 leading-tight">{label}</p>
      </div>
    </div>
  )
}

function OrderCard({ order, saving, actionLabel, actionClass, onAction, onDetail, highlight }) {
  return (
    <div className={clsx(
      'bg-white rounded-2xl border overflow-hidden shadow-sm transition-all',
      highlight ? 'border-green-400' : 'border-gray-100'
    )}>
      <div className={clsx('px-4 py-2.5 flex items-center justify-between', highlight ? 'bg-green-50' : 'bg-gray-50')}>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 text-sm">{order.table?.name || order.order_number}</span>
            <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', TYPE_COLORS[order.type])}>
              {TYPE_LABELS[order.type]}
            </span>
          </div>
          <p className="text-gray-400 text-xs">{formatDate(order.created_at)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="px-4 py-2 space-y-0.5">
        {order.items?.map(item => (
          <p key={item.id} className="text-xs text-gray-600">{item.quantity}× {item.product?.name}</p>
        ))}
        <p className="text-primary-500 font-bold text-sm mt-1">{formatCurrency(order.total)}</p>
        {order.customer_name && <p className="text-xs text-gray-400">👤 {order.customer_name}</p>}
      </div>
      <div className="px-3 pb-3 flex gap-2">
        {onAction && (
          <button onClick={onAction} disabled={saving}
            className={clsx('flex-1 py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors', actionClass)}>
            {actionLabel}
          </button>
        )}
        <button onClick={onDetail}
          className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 text-xs transition-colors">
          Détail
        </button>
      </div>
    </div>
  )
}
