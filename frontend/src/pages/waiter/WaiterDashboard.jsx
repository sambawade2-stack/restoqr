import { useState, useCallback } from 'react'
import { LogOut, UtensilsCrossed, RefreshCw, KeyRound, CheckCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { getKitchenOrders, updateKitchenStatus } from '../../api/orders'
import { logout } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import { usePolling } from '../../hooks/usePolling'
import { formatDate } from '../../utils/format'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ChangePasswordModal from '../../components/common/ChangePasswordModal'
import clsx from 'clsx'

const TYPE_LABELS = { dine_in: 'Table', delivery: 'Livraison', takeaway: 'Emporter' }
const TYPE_COLORS = {
  dine_in:  'bg-blue-100 text-blue-700',
  delivery: 'bg-purple-100 text-purple-700',
  takeaway: 'bg-amber-100 text-amber-700',
}

export default function WaiterDashboard() {
  const { user, clearAuth }         = useAuthStore()
  const [orders, setOrders]         = useState({ pending: [], preparing: [], ready: [] })
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [updating, setUpdating]     = useState(null)
  const [pwdModal, setPwdModal]     = useState(false)

  const fetch = useCallback(async () => {
    try {
      const { data } = await getKitchenOrders()
      setOrders(data)
      setError(null)
    } catch (err) {
      const msg = err.response?.data?.message || 'Impossible de charger les commandes.'
      setError(msg)
      toast.error(msg)
    } finally { setLoading(false) }
  }, [])

  usePolling(fetch, 3_000, true, true)

  async function handleServe(order) {
    setUpdating(order.id)
    try {
      await updateKitchenStatus(order.id, 'served')
      toast.success('Commande servie !')
      await fetch()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally {
      setUpdating(null)
    }
  }

  async function handleLogout() {
    await logout().catch(() => {})
    clearAuth()
    window.location.href = '/login'
  }

  const readyOrders = orders.ready ?? []

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Service en salle</h1>
              <p className="text-gray-500 text-xs">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={fetch} className="p-2 hover:bg-gray-100 rounded-lg" title="Actualiser">
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={() => setPwdModal(true)} className="p-2 hover:bg-gray-100 rounded-lg" title="Changer le mot de passe">
              <KeyRound className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-lg">
              <LogOut className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto p-4">
        {/* Counter */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            Commandes prêtes à servir
          </h2>
          {readyOrders.length > 0 && (
            <span className="bg-primary-500 text-white text-sm font-bold px-3 py-1 rounded-full animate-pulse">
              {readyOrders.length} en attente
            </span>
          )}
        </div>

        {error ? (
          <div className="text-center py-24">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-sm mx-auto">
              <p className="text-red-600 font-semibold mb-1">Erreur de connexion</p>
              <p className="text-red-500 text-sm">{error}</p>
              <button onClick={fetch} className="mt-4 btn-primary text-sm">
                Réessayer
              </button>
            </div>
          </div>
        ) : readyOrders.length === 0 ? (
          <div className="text-center py-24">
            <CheckCheck className="w-14 h-14 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Aucune commande prête pour le moment</p>
            <p className="text-gray-300 text-sm mt-1">Actualisation automatique toutes les 5s</p>
          </div>
        ) : (
          <div className="space-y-3">
            {readyOrders.map(order => (
              <div key={order.id}
                className="bg-white rounded-2xl border-2 border-green-400 shadow-sm overflow-hidden">
                {/* Card header */}
                <div className="bg-green-50 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 text-lg">
                      {order.table ? order.table.name : '—'}
                    </span>
                    <span className="text-sm font-bold text-gray-500">
                      #{String(order.number).padStart(3, '0')}
                    </span>
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', TYPE_COLORS[order.type])}>
                      {TYPE_LABELS[order.type]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-green-700 font-semibold">Prête</span>
                  </div>
                </div>

                {/* Items */}
                <div className="px-4 py-3 space-y-1">
                  {order.items?.map(item => (
                    <div key={item.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="font-bold text-primary-500 w-6">{item.quantity}×</span>
                      <span>{item.product?.name}</span>
                      {item.notes && (
                        <span className="text-xs text-gray-400 italic">({item.notes})</span>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-gray-400 pt-1">{formatDate(order.created_at)}</p>
                </div>

                {/* Action */}
                <div className="px-4 pb-4">
                  <button
                    onClick={() => handleServe(order)}
                    disabled={updating === order.id}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {updating === order.id
                      ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <><CheckCheck className="w-4 h-4" /> Marquer comme servie</>
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <ChangePasswordModal open={pwdModal} onClose={() => setPwdModal(false)} />
    </div>
  )
}
