import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Truck, Store, Plus, Minus, ChevronRight, UtensilsCrossed } from 'lucide-react'
import toast from 'react-hot-toast'
import { getDeliveryMenu } from '../../api/menu'
import { placeDeliveryOrder } from '../../api/orders'
import { useCartStore } from '../../store/cartStore'
import { formatCurrency } from '../../utils/format'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const TABS = [
  { key: 'delivery', label: 'Livraison', icon: Truck },
  { key: 'takeaway', label: 'À Emporter', icon: Store },
]

export default function DeliveryPage() {
  const { slug }   = useParams()
  const navigate   = useNavigate()
  const { items, addItem, updateQuantity, clearCart, getTotal, initCart, currency } = useCartStore()

  const [menu, setMenu]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState(0)          // categories
  const [orderType, setOrderType] = useState('delivery') // delivery | takeaway
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    customer_name:    '',
    customer_phone:   '',
    delivery_address: '',
    notes:            '',
  })

  useEffect(() => {
    getDeliveryMenu(slug)
      .then(({ data }) => {
        setMenu(data)
        initCart(data.restaurant, null)
        clearCart()
      })
      .catch(() => toast.error('Menu indisponible.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (items.length === 0) { toast.error('Votre panier est vide.'); return }
    setSubmitting(true)
    try {
      const payload = {
        type: orderType,
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        ...form,
      }
      const { data } = await placeDeliveryOrder(slug, payload)
      clearCart()
      toast.success('Commande envoyée ! 🎉')
      navigate(`/track/${data.order_number}`)
    } catch (err) {
      const errors = err.response?.data?.errors
      if (errors) {
        const first = Object.values(errors)[0]
        toast.error(Array.isArray(first) ? first[0] : first)
      } else {
        toast.error(err.response?.data?.message || 'Erreur.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>
  if (!menu)   return null

  const total = getTotal()

  return (
    <div className="min-h-screen bg-gray-50 max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">{menu.restaurant.name}</h1>
            <p className="text-sm text-gray-500">Commande à distance</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Order type toggle */}
        <div className="card p-1 flex gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setOrderType(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                orderType === key
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Left: form */}
          <div className="card p-5 space-y-4">
            <h2 className="font-bold text-gray-900">Vos Informations</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input className="input" placeholder="Votre nom"
                value={form.customer_name}
                onChange={e => setForm({...form, customer_name: e.target.value})} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input className="input" placeholder="+221 77 000 00 00" type="tel"
                value={form.customer_phone}
                onChange={e => setForm({...form, customer_phone: e.target.value})} />
            </div>

            {orderType === 'delivery' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse de Livraison</label>
                <input className="input" placeholder="Votre adresse" required
                  value={form.delivery_address}
                  onChange={e => setForm({...form, delivery_address: e.target.value})} />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (optionnel)</label>
              <textarea className="input resize-none" rows={2} placeholder="Instructions spéciales..."
                value={form.notes}
                onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
          </div>

          {/* Right: order summary + menu */}
          <div className="space-y-4">
            {/* Cart summary */}
            <div className="card p-5">
              <h2 className="font-bold text-gray-900 mb-3">Votre Commande</h2>
              {items.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">
                  Ajoutez des plats depuis le menu ci-dessous
                </p>
              ) : (
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.product_id} className="flex items-center gap-2 text-sm">
                      {item.image && <img src={item.image} className="w-10 h-10 rounded-lg object-cover" alt="" />}
                      <span className="flex-1 text-gray-700">{item.name}</span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(item.total_price, currency)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-gray-100 pt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-primary-500">{formatCurrency(total, currency)}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || items.length === 0}
              className="btn-primary w-full flex items-center justify-center gap-2 py-4"
            >
              {submitting
                ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <>Confirmer &amp; Commander <ChevronRight className="w-5 h-5" /></>
              }
            </button>
          </div>
        </div>

        {/* Mini menu */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-3">Menu</h2>
          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {menu.categories.map((cat, idx) => (
              <button key={cat.id} type="button"
                onClick={() => setActiveTab(idx)}
                className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  activeTab === idx ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {menu.categories[activeTab]?.products.map(product => {
              const cartItem = items.find(i => i.product_id === product.id)
              const qty      = cartItem?.quantity || 0

              return (
                <div key={product.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                  {product.image && <img src={product.image} className="w-12 h-12 rounded-lg object-cover shrink-0" alt="" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{product.name}</p>
                    <p className="text-primary-500 text-sm font-bold">{formatCurrency(product.price, currency)}</p>
                  </div>
                  {qty === 0 ? (
                    <button type="button" onClick={() => addItem(product)}
                      className="shrink-0 w-8 h-8 bg-primary-500 text-white rounded-lg flex items-center justify-center hover:bg-primary-600">
                      <Plus className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => updateQuantity(product.id, qty - 1)}
                        className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold">{qty}</span>
                      <button type="button" onClick={() => addItem(product)}
                        className="w-7 h-7 bg-primary-500 text-white rounded-lg flex items-center justify-center">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </form>
    </div>
  )
}
