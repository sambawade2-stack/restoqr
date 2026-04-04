import { useState, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, TrendingUp, ClipboardList, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { getOrderHistory } from '../../api/settings'
import { useAuthStore } from '../../store/authStore'
import { formatCurrency, formatDate } from '../../utils/format'
import StatusBadge from '../../components/common/StatusBadge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import clsx from 'clsx'

const TYPE_LABELS  = { dine_in: 'Sur place', delivery: 'Livraison', takeaway: 'À emporter' }
const TYPE_COLORS  = {
  dine_in:  'bg-blue-100 text-blue-700',
  delivery: 'bg-purple-100 text-purple-700',
  takeaway: 'bg-amber-100 text-amber-700',
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export default function OrderHistory() {
  const { user } = useAuthStore()
  const [date, setDate]         = useState(todayStr())
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [search, setSearch]     = useState('')

  async function load(d) {
    setLoading(true)
    setExpanded(null)
    try {
      const { data: res } = await getOrderHistory(d)
      setData(res)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur de chargement')
      setData(null)
    } finally { setLoading(false) }
  }

  useEffect(() => { load(date) }, [date])

  function shift(days) {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    const s = d.toISOString().split('T')[0]
    if (s <= todayStr()) setDate(s)
  }

  const currency = user?.restaurant?.currency ?? 'FCFA'

  const filtered = (data?.orders ?? []).filter(o =>
    !search || o.order_number.toLowerCase().includes(search.toLowerCase())
      || o.table?.name?.toLowerCase().includes(search.toLowerCase())
      || o.customer_name?.toLowerCase().includes(search.toLowerCase())
  )

  const dateLabel = (() => {
    const today = todayStr()
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    const yStr = yesterday.toISOString().split('T')[0]
    if (date === today) return "Aujourd'hui"
    if (date === yStr)  return 'Hier'
    return new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  })()

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Historique des commandes</h1>

      {/* Date picker */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-3 flex-wrap">
        <button onClick={() => shift(-1)}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>

        <div className="flex items-center gap-2 flex-1 justify-center">
          <Calendar className="w-5 h-5 text-primary-500" />
          <span className="font-bold text-gray-800 text-lg capitalize">{dateLabel}</span>
          <input
            type="date" value={date} max={todayStr()}
            onChange={e => e.target.value && setDate(e.target.value)}
            className="border border-gray-200 rounded-xl px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>

        <button onClick={() => shift(1)} disabled={date >= todayStr()}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-30">
          <ChevronRight className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {loading ? <LoadingSpinner size="lg" className="py-20" /> : data && (
        <>
          {/* Résumé */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-gray-800">{data.summary.total_orders}</p>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
                <ClipboardList className="w-3 h-3" /> Commandes
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-green-600">{data.summary.paid_orders}</p>
              <p className="text-xs text-gray-500 mt-0.5">Payées</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
              <p className="text-xl font-bold text-primary-600">{formatCurrency(data.summary.total_revenue)}</p>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3" /> Recettes
              </p>
            </div>
          </div>

          {/* Recherche */}
          {data.orders.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher par N°, table, client..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
          )}

          {/* Liste */}
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">
                {data.orders.length === 0 ? 'Aucune commande ce jour' : 'Aucun résultat'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(order => (
                <div key={order.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Row */}
                  <button
                    onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-800 text-sm">{order.order_number}</span>
                        <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', TYPE_COLORS[order.type])}>
                          {TYPE_LABELS[order.type]}
                        </span>
                        {order.table && (
                          <span className="text-xs text-gray-500">{order.table.name}</span>
                        )}
                        {order.customer_name && (
                          <span className="text-xs text-gray-500">👤 {order.customer_name}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={order.status} size="sm" />
                      <span className="font-bold text-gray-800">{formatCurrency(order.total)}</span>
                    </div>
                  </button>

                  {/* Détail */}
                  {expanded === order.id && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-2">
                      {order.items?.map(item => (
                        <div key={item.id} className="flex justify-between text-sm text-gray-700">
                          <span>{item.quantity}× {item.product?.name}</span>
                          <span className="font-medium">{formatCurrency(item.total_price)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold text-sm border-t border-gray-200 pt-2 mt-2">
                        <span>Total</span>
                        <span className="text-primary-600">{formatCurrency(order.total)}</span>
                      </div>
                      {order.payment && (
                        <p className="text-xs text-gray-400">
                          Réglé par : {order.payment.method === 'cash' ? 'Espèces' : order.payment.method === 'card' ? 'Carte' : 'Mobile Money'}
                        </p>
                      )}
                      {order.notes && (
                        <p className="text-xs text-yellow-700 bg-yellow-50 rounded-lg px-2 py-1">📝 {order.notes}</p>
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
  )
}
