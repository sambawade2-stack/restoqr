import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle, Clock, ChefHat, Bell, CreditCard, Timer } from 'lucide-react'
import { trackOrder } from '../../api/orders'
import { usePolling } from '../../hooks/usePolling'
import { formatCurrency } from '../../utils/format'
import LoadingSpinner from '../../components/common/LoadingSpinner'

// Temps estimé restant (en secondes) selon le statut
const ESTIMATED_REMAINING = {
  pending:   12 * 60,
  accepted:  10 * 60,
  preparing:  6 * 60,
  ready:      0,
  served:     0,
}

function useElapsed(createdAt) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!createdAt) return
    const start = new Date(createdAt).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [createdAt])
  return elapsed
}

function formatDuration(seconds) {
  if (seconds <= 0) return '0 min'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  if (s === 0) return `${m} min`
  return `${m} min ${s}s`
}

const STEPS = [
  { status: 'pending',   label: 'Commande reçue',    icon: Clock,       badge: 'En attente' },
  { status: 'accepted',  label: 'Acceptée',           icon: CheckCircle, badge: 'Acceptée' },
  { status: 'preparing', label: 'En préparation',     icon: ChefHat,     badge: 'En cuisine' },
  { status: 'ready',     label: 'Prête à servir',     icon: Bell,        badge: 'Prête !' },
  { status: 'served',    label: 'Servie',             icon: CheckCircle, badge: 'Servie ✓' },
  { status: 'paid',      label: 'Payée',              icon: CreditCard,  badge: 'Payée' },
]

const FINAL_STATUSES = ['paid', 'closed']

export default function TrackOrder() {
  const { orderNumber }   = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  const elapsed = useElapsed(order?.created_at)

  const fetch = async () => {
    try {
      const { data } = await trackOrder(orderNumber)
      setOrder(data)
    } catch {}
    finally { setLoading(false) }
  }

  usePolling(fetch, 5_000)

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>
  if (!order)  return <div className="min-h-screen flex items-center justify-center text-gray-500">Commande introuvable</div>

  // ── Écran final : commande payée ─────────────────────────────────────────
  if (FINAL_STATUSES.includes(order.status)) {
    return (
      <div className="min-h-screen bg-gray-50 max-w-md mx-auto p-4 flex flex-col items-center justify-center">
        <div className="card p-8 w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Merci !</h1>
          <p className="text-gray-500 mt-1">Votre commande a été payée.</p>

          <div className="mt-6 bg-primary-50 rounded-2xl p-4">
            <p className="text-4xl font-black text-primary-500">
              #{String(order.number).padStart(3, '0')}
            </p>
            {order.table && (
              <p className="text-sm text-gray-500 mt-1">{order.table.name}</p>
            )}
          </div>

          <div className="mt-5 space-y-2 text-sm text-left">
            {order.items?.map(item => (
              <div key={item.id} className="flex justify-between">
                <span className="text-gray-700">{item.quantity}× {item.product?.name}</span>
                <span className="font-medium">{formatCurrency(item.total_price)}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-base">
              <span>Total payé</span>
              <span className="text-green-600">{formatCurrency(order.total)}</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-6">Bonne journée ! 😊</p>
        </div>
      </div>
    )
  }

  // ── Suivi en cours ───────────────────────────────────────────────────────
  const currentIdx = STEPS.findIndex(s => s.status === order.status)

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto p-4">
      <div className="text-center mb-6 pt-6">
        <h1 className="text-2xl font-bold text-gray-900">Suivi de commande</h1>
        <p className="text-3xl font-black text-primary-500 mt-1">
          #{String(order.number).padStart(3, '0')}
        </p>
        {order.table && (
          <p className="text-sm text-gray-500 mt-1">{order.table.name}</p>
        )}
        <p className="text-xs text-gray-300 mt-0.5">{order.order_number}</p>
      </div>

      {/* Minuteur */}
      {order.status !== 'served' && order.status !== 'ready' && (
        <div className="card p-4 mb-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <Timer className="w-5 h-5 text-primary-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">Temps écoulé</p>
            <p className="text-lg font-black text-gray-900 tabular-nums">{formatDuration(elapsed)}</p>
          </div>
          {ESTIMATED_REMAINING[order.status] > 0 && (
            <div className="text-right shrink-0">
              <p className="text-xs text-gray-400 mb-0.5">Estimation</p>
              <p className="text-sm font-bold text-primary-500">
                ~{formatDuration(Math.max(0, ESTIMATED_REMAINING[order.status] - elapsed))}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Statut principal */}
      {order.status === 'ready' && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 text-center">
          <p className="text-green-700 font-bold text-lg">🔔 Votre commande est prête !</p>
          <p className="text-green-600 text-sm mt-0.5">Elle va vous être apportée dans un instant.</p>
        </div>
      )}
      {order.status === 'served' && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4 text-center">
          <p className="text-blue-700 font-bold text-lg">✅ Commande servie !</p>
          <p className="text-blue-600 text-sm mt-0.5">Bon appétit ! Le règlement se fait à la caisse.</p>
        </div>
      )}

      {/* Étapes */}
      <div className="card p-6 mb-4">
        <div className="space-y-4">
          {STEPS.map((step, idx) => {
            const Icon   = step.icon
            const done   = idx <= currentIdx
            const active = idx === currentIdx

            return (
              <div key={step.status} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  done
                    ? active ? 'bg-primary-500 text-white' : 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-300'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${done ? 'text-gray-900' : 'text-gray-400'}`}>
                    {step.label}
                  </p>
                </div>
                {active && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full animate-pulse ${
                    step.status === 'served' ? 'bg-blue-100 text-blue-600' :
                    step.status === 'ready'  ? 'bg-green-100 text-green-600' :
                    'bg-primary-100 text-primary-600'
                  }`}>
                    {step.badge}
                  </span>
                )}
                {done && !active && <CheckCircle className="w-4 h-4 text-green-500" />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Récapitulatif */}
      <div className="card p-5">
        <h3 className="font-bold text-gray-900 mb-3">Votre commande</h3>
        <div className="space-y-2">
          {order.items?.map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-700">{item.quantity}× {item.product?.name}</span>
              <span className="font-medium">{formatCurrency(item.total_price)}</span>
            </div>
          ))}
          <div className="border-t border-gray-100 pt-2 flex justify-between font-bold">
            <span>Total</span>
            <span className="text-primary-500">{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        Actualisation automatique toutes les 5 secondes
      </p>
    </div>
  )
}
