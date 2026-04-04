import { useState, useCallback } from 'react'
import { LogOut, ChefHat, RefreshCw, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { getKitchenOrders, updateKitchenStatus, markItemReady } from '../../api/orders'
import { logout } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import { usePolling } from '../../hooks/usePolling'
import { formatCurrency, formatDate } from '../../utils/format'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ChangePasswordModal from '../../components/common/ChangePasswordModal'
import clsx from 'clsx'

const TABS = ['Nouvelles', 'À Préparer', 'En Cours', 'Prêtes']

const TYPE_LABELS = { dine_in: 'Table', delivery: 'Livraison', takeaway: 'Emporter' }
const TYPE_COLORS = {
  dine_in:  'bg-blue-100 text-blue-700',
  delivery: 'bg-purple-100 text-purple-700',
  takeaway: 'bg-amber-100 text-amber-700',
}

const NEXT_STATUS = {
  pending:   'accepted',
  accepted:  'preparing',
  preparing: 'ready',
  ready:     'served',
}
const NEXT_LABEL = {
  pending:   'Accepter',
  accepted:  'Commencer',
  preparing: 'Marquer Prête',
  ready:     'Marquer Servie',
}

export default function KitchenDashboard() {
  const { user, clearAuth } = useAuthStore()
  const [orders, setOrders] = useState({ pending: [], preparing: [], ready: [] })
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState(0)
  const [pwdModal, setPwdModal] = useState(false)
  const [updating, setUpdating] = useState(null)

  const fetch = useCallback(async () => {
    try {
      const { data } = await getKitchenOrders()
      setOrders(data)
    } catch {}
    finally { setLoading(false) }
  }, [])

  usePolling(fetch, 3_000, true, true) // alwaysRefresh — rafraîchit même si l'employé est actif

  // Quel onglet afficher après avoir changé le statut d'une commande
  const NEXT_TAB = { pending: 1, accepted: 2, preparing: 3 }

  async function handleStatusChange(order) {
    const next = NEXT_STATUS[order.status]
    if (!next) return
    setUpdating(order.id)
    try {
      await updateKitchenStatus(order.id, next)
      await fetch()
      // Basculer automatiquement sur l'onglet où la commande vient d'arriver
      const nextTab = NEXT_TAB[order.status]
      if (nextTab !== undefined) setTab(nextTab)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally {
      setUpdating(null)
    }
  }

  async function handleItemReady(orderId, itemId) {
    try {
      await markItemReady(orderId, itemId)
      toast.success('Article prêt !')
      await fetch()
    } catch {}
  }

  async function handleLogout() {
    await logout().catch(() => {})
    clearAuth()
    window.location.href = '/login'
  }

  const newOrders    = orders.pending  ?? []
  const allPreparing = [...(orders.preparing ?? [])]
  const toStart      = allPreparing.filter(o => o.status === 'accepted')
  const inProgress   = allPreparing.filter(o => o.status === 'preparing')
  const readyOrders  = orders.ready ?? []

  const tabOrders = tab === 0 ? newOrders
                  : tab === 1 ? toStart
                  : tab === 2 ? inProgress
                  :             readyOrders

  const tabCounts = [newOrders.length, toStart.length, inProgress.length, readyOrders.length]

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <LoadingSpinner size="lg" className="text-white" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-white">Tableau de Bord Cuisine</h1>
            <p className="text-gray-400 text-xs">{user?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetch} className="p-2 hover:bg-gray-700 rounded-lg transition-colors" title="Actualiser">
            <RefreshCw className="w-5 h-5 text-gray-400" />
          </button>
          <button onClick={() => setPwdModal(true)} className="p-2 hover:bg-gray-700 rounded-lg transition-colors" title="Changer le mot de passe">
            <KeyRound className="w-5 h-5 text-gray-400" />
          </button>
          <button onClick={handleLogout} className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
            <LogOut className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4 overflow-x-auto">
        {TABS.map((label, idx) => {
          const count   = tabCounts[idx]
          const isNew   = idx === 0
          const active  = tab === idx
          return (
            <button
              key={idx}
              onClick={() => setTab(idx)}
              className={clsx(
                'relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap',
                active
                  ? isNew ? 'bg-orange-500 text-white' : 'bg-primary-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              )}
            >
              {label}
              {count > 0 && (
                <span className={clsx(
                  'text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold',
                  active
                    ? 'bg-white/20'
                    : isNew ? 'bg-orange-500 text-white animate-pulse' : 'bg-gray-700'
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Banner when new orders are waiting */}
      {newOrders.length > 0 && tab !== 0 && (
        <div
          className="mx-6 mt-3 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-2 flex items-center justify-between cursor-pointer"
          onClick={() => setTab(0)}
        >
          <span className="text-orange-400 text-sm font-medium">
            🔔 {newOrders.length} nouvelle{newOrders.length > 1 ? 's' : ''} commande{newOrders.length > 1 ? 's' : ''} en attente
          </span>
          <span className="text-orange-400 text-xs underline">Voir</span>
        </div>
      )}

      {/* Orders grid */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tabOrders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            updating={updating === order.id}
            onStatusChange={() => handleStatusChange(order)}
            onItemReady={handleItemReady}
          />
        ))}

        {tabOrders.length === 0 && (
          <div className="col-span-full text-center py-20">
            <ChefHat className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aucune commande</p>
          </div>
        )}
      </div>

      <ChangePasswordModal open={pwdModal} onClose={() => setPwdModal(false)} />
    </div>
  )
}

function OrderCard({ order, updating, onStatusChange, onItemReady }) {
  const nextLabel  = NEXT_LABEL[order.status]
  const isReady    = order.status === 'ready'
  const isPending  = order.status === 'pending'

  return (
    <div className={clsx(
      'bg-gray-800 rounded-2xl border overflow-hidden transition-all',
      isReady   ? 'border-green-500'  :
      isPending ? 'border-orange-500' :
                  'border-gray-700'
    )}>
      {/* Card header */}
      <div className={clsx(
        'px-4 py-3 flex items-center justify-between',
        isReady   ? 'bg-green-900/30'  :
        isPending ? 'bg-orange-900/30' :
                    'bg-gray-700/50'
      )}>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white">
              {order.table ? order.table.name : order.order_number}
            </span>
            <span className="text-xs font-bold text-gray-400">
              #{String(order.number).padStart(3, '0')}
            </span>
            <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', TYPE_COLORS[order.type])}>
              {TYPE_LABELS[order.type]}
            </span>
          </div>
          <p className="text-gray-400 text-xs mt-0.5">{formatDate(order.created_at)}</p>
        </div>
        {isReady && (
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
        )}
        {isPending && (
          <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
        )}
      </div>

      {/* Items */}
      <div className="p-4 space-y-2">
        {order.items?.map(item => (
          <div key={item.id} className="flex items-center gap-2">
            {item.product?.image && (
              <img src={item.product.image} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {item.quantity}× {item.product?.name}
              </p>
              {item.notes && (
                <p className="text-yellow-400 text-xs truncate">📝 {item.notes}</p>
              )}
            </div>
            {!isReady && !isPending && (
              <button
                onClick={() => onItemReady(order.id, item.id)}
                className={clsx(
                  'shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors',
                  item.is_ready
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-600 hover:border-green-500'
                )}
              >
                {item.is_ready && <span className="text-xs">✓</span>}
              </button>
            )}
          </div>
        ))}

        {order.notes && (
          <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-lg p-2 mt-2">
            <p className="text-yellow-400 text-xs">📝 {order.notes}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4">
        {nextLabel && (
          <button
            onClick={onStatusChange}
            disabled={updating}
            className={clsx(
              'w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2',
              isReady   ? 'bg-green-600 hover:bg-green-700 text-white'   :
              isPending ? 'bg-orange-500 hover:bg-orange-600 text-white' :
                          'bg-primary-500 hover:bg-primary-600 text-white'
            )}
          >
            {updating
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : nextLabel
            }
          </button>
        )}
      </div>
    </div>
  )
}
