import { useState, useCallback } from 'react'
import { Eye, CreditCard, RefreshCw, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAdminOrders, updateOrderStatus, processPayment } from '../../api/orders'
import { usePolling } from '../../hooks/usePolling'
import { formatCurrency, formatDate, STATUS_LABELS } from '../../utils/format'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import clsx from 'clsx'

const FILTERS = [
  { key: '',          label: 'Toutes' },
  { key: 'pending',   label: 'En Attente' },
  { key: 'preparing', label: 'En Préparation' },
  { key: 'ready',     label: 'Prêtes' },
  { key: 'paid',      label: 'Payées' },
]

const ORDER_TRANSITIONS = {
  pending:   ['accepted', 'cancelled'],
  accepted:  ['preparing', 'cancelled'],
  preparing: ['ready'],
  ready:     ['served'],
  served:    ['paid'],
}

export default function OrdersManagement() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected]  = useState(null)
  const [payModal, setPayModal]   = useState(false)
  const [payMethod, setPayMethod] = useState('cash')
  const [saving, setSaving]       = useState(false)

  const fetch = useCallback(async () => {
    try {
      const params = { today: 1, ...(statusFilter ? { status: statusFilter } : {}) }
      const { data } = await getAdminOrders(params)
      setOrders(data.data || [])
    } catch {}
    finally { setLoading(false) }
  }, [statusFilter])

  usePolling(fetch, 5_000)

  async function handleStatus(order, newStatus) {
    setSaving(true)
    try {
      await updateOrderStatus(order.id, newStatus)
      toast.success('Statut mis à jour')
      await fetch()
      if (selected?.id === order.id) {
        setSelected(prev => ({ ...prev, status: newStatus }))
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally { setSaving(false) }
  }

  async function handlePayment() {
    if (!selected) return
    setSaving(true)
    try {
      await processPayment(selected.id, { method: payMethod })
      toast.success('Paiement enregistré !')
      setPayModal(false)
      setSelected(null)
      await fetch()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commandes Clients</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gestion des commandes du jour</p>
        </div>
        <button onClick={fetch} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <RefreshCw className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={clsx(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
              statusFilter === f.key
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table / Cards */}
      {loading ? <LoadingSpinner size="lg" className="py-20" /> : (
        <div className="card overflow-hidden">

          {/* ── Mobile: card list (< md) ─────────────────────────────────── */}
          <div className="md:hidden">
            {orders.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p>Aucune commande</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {orders.map(order => {
                  const nextStatuses = ORDER_TRANSITIONS[order.status] || []
                  return (
                    <div key={order.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 text-sm">
                            {order.table?.name || order.order_number}
                          </span>
                          <span className="text-xs font-bold text-gray-400">#{String(order.number).padStart(3, '0')}</span>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {order.customer_name || '—'} · {formatDate(order.created_at)}
                        </p>
                        <p className="text-sm font-bold text-primary-500 mt-0.5">
                          {formatCurrency(order.total)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {nextStatuses.length > 0 && (
                          <select
                            key={`${order.id}-${order.status}`}
                            onChange={e => e.target.value && handleStatus(order, e.target.value)}
                            value=""
                            disabled={saving}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                          >
                            <option value="">Changer…</option>
                            {nextStatuses.map(s => (
                              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                            ))}
                          </select>
                        )}
                        <div className="flex items-center gap-1.5">
                          {order.status === 'served' && (
                            <button
                              onClick={() => { setSelected(order); setPayModal(true) }}
                              className="flex items-center gap-1 bg-green-600 text-white text-xs px-2.5 py-1.5 rounded-lg font-semibold"
                            >
                              <CreditCard className="w-3 h-3" /> Payer
                            </button>
                          )}
                          <button
                            onClick={() => setSelected(order)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg"
                          >
                            <Eye className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Desktop: table (>= md) ───────────────────────────────────── */}
          <table className="hidden md:table w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 font-medium">
                <th className="text-left px-4 py-3">Commande</th>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Total</th>
                <th className="text-left px-4 py-3">Statut</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map(order => {
                const nextStatuses = ORDER_TRANSITIONS[order.status] || []
                return (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{order.table?.name || order.order_number}</p>
                        <span className="text-xs font-bold text-gray-400">#{String(order.number).padStart(3, '0')}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.created_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{order.customer_name || '—'}</p>
                      <p className="text-xs text-gray-400">{order.customer_phone || ''}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {nextStatuses.length > 0 && (
                          <select
                            key={`${order.id}-${order.status}`}
                            onChange={e => e.target.value && handleStatus(order, e.target.value)}
                            value=""
                            disabled={saving}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                          >
                            <option value="">Changer…</option>
                            {nextStatuses.map(s => (
                              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                            ))}
                          </select>
                        )}
                        {order.status === 'served' && (
                          <button
                            onClick={() => { setSelected(order); setPayModal(true) }}
                            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                          >
                            <CreditCard className="w-3 h-3" /> Payer
                          </button>
                        )}
                        <button
                          onClick={() => setSelected(order)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {orders.length === 0 && (
            <div className="hidden md:block text-center py-16 text-gray-400">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>Aucune commande</p>
            </div>
          )}
        </div>
      )}

      {/* Order detail modal */}
      <Modal open={!!selected && !payModal} onClose={() => setSelected(null)} title={`Commande — ${selected?.table?.name || selected?.order_number}`}>
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <StatusBadge status={selected.status} size="md" />
              <span className="font-bold text-gray-900">{formatCurrency(selected.total)}</span>
            </div>
            <div className="space-y-2">
              {selected.items?.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.quantity}× {item.product?.name}</span>
                  <span className="font-medium">{formatCurrency(item.total_price)}</span>
                </div>
              ))}
            </div>
            {selected.notes && (
              <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 text-sm text-yellow-800">
                📝 {selected.notes}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Payment modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Enregistrer le Paiement">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Moyen de paiement</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'cash',          label: 'Espèces' },
                { key: 'wave',          label: 'Wave' },
                { key: 'orange_money',  label: 'Orange Money' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setPayMethod(key)}
                  className={clsx(
                    'py-2 rounded-xl text-sm font-semibold border-2 transition-colors',
                    payMethod === key
                      ? 'border-primary-500 bg-primary-50 text-primary-600'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total à encaisser</span>
            <span className="text-primary-500">{formatCurrency(selected?.total || 0)}</span>
          </div>
          <button onClick={handlePayment} disabled={saving} className="btn-success w-full py-3">
            {saving ? '…' : 'Confirmer le paiement'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
