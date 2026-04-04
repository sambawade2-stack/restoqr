import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ShoppingCart, Plus, Minus, ChevronRight, UtensilsCrossed } from 'lucide-react'
import toast from 'react-hot-toast'
import { getTableMenu } from '../../api/menu'
import { placeTableOrder } from '../../api/orders'
import { useCartStore } from '../../store/cartStore'
import { formatCurrency } from '../../utils/format'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function MenuPage() {
  const { slug, tableId } = useParams()
  const [searchParams]    = useSearchParams()
  const navigate          = useNavigate()
  const token             = searchParams.get('token')

  const { items, addItem, removeItem, updateQuantity, clearCart,
          getTotal, getCount, initCart, restaurant, table, currency } = useCartStore()

  const [menu, setMenu]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState(0)
  const [showCart, setShowCart] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) { toast.error('QR code invalide.'); return }
    getTableMenu(slug, tableId, token)
      .then(({ data }) => {
        setMenu(data)
        initCart(data.restaurant, data.table)
        clearCart()
      })
      .catch(() => toast.error('Menu indisponible. Scannez à nouveau le QR code.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleOrder() {
    if (items.length === 0) return
    setSubmitting(true)
    try {
      const payload = {
        type:  'dine_in',
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity, notes: i.notes })),
      }
      const { data } = await placeTableOrder(slug, tableId, token, payload)
      clearCart()
      setShowCart(false)
      toast.success('Commande envoyée ! 🎉')
      navigate(`/track/${data.order_number}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la commande.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto">
      {/* Header skeleton */}
      <div className="bg-white shadow-sm">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded-lg animate-pulse w-32" />
            <div className="h-3 bg-gray-100 rounded-lg animate-pulse w-20" />
          </div>
        </div>
        {/* Category tabs skeleton */}
        <div className="flex gap-2 px-4 pb-3">
          {[80,60,70,55].map((w,i) => (
            <div key={i} className={`h-7 bg-gray-200 rounded-full animate-pulse shrink-0`} style={{width: w}} />
          ))}
        </div>
      </div>
      {/* Products skeleton */}
      <div className="px-4 pt-4 space-y-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 flex gap-3">
            <div className="w-20 h-20 bg-gray-200 rounded-xl animate-pulse shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
              <div className="h-8 bg-gray-200 rounded-xl animate-pulse w-24 mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  if (!menu) return null

  const count = getCount()
  const total = getTotal()

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative pb-28">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          {menu.restaurant.logo
            ? <img src={menu.restaurant.logo} alt="" className="w-10 h-10 rounded-xl object-cover" />
            : <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-primary-500" />
              </div>
          }
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 truncate">{menu.restaurant.name}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center bg-primary-100 text-primary-700 text-xs font-bold px-2 py-0.5 rounded-full">
                N°{menu.table.number}
              </span>
              <span className="text-sm text-gray-500">{menu.table.name}</span>
            </div>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {menu.categories.map((cat, idx) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(idx)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === idx
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products */}
      <div className="px-4 pt-4 space-y-3">
        {menu.categories[activeTab]?.products.map(product => {
          const cartItem = items.find(i => i.product_id === product.id)
          const qty      = cartItem?.quantity || 0

          return (
            <div key={product.id} className="card p-4 flex gap-3">
              {product.image && (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-20 h-20 rounded-xl object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{product.name}</h3>
                {product.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{product.description}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-primary-500 font-bold">
                    {formatCurrency(product.price, currency)}
                  </span>
                  {qty === 0 ? (
                    <button
                      onClick={() => addItem(product)}
                      className="flex items-center gap-1 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-3 py-1.5 rounded-xl transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(product.id, qty - 1)}
                        className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-6 text-center font-bold text-gray-900">{qty}</span>
                      <button
                        onClick={() => addItem(product)}
                        className="w-7 h-7 bg-primary-500 hover:bg-primary-600 text-white rounded-lg flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Cart FAB */}
      {count > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm
                     bg-primary-500 hover:bg-primary-600 text-white font-bold py-4 px-6
                     rounded-2xl shadow-xl flex items-center justify-between z-20 transition-colors"
        >
          <span className="bg-white/20 rounded-xl px-2.5 py-0.5 text-sm font-bold">
            {count} article{count > 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-2">
            Voir ma commande
            <ChevronRight className="w-5 h-5" />
          </span>
          <span className="font-bold">{formatCurrency(total, currency)}</span>
        </button>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCart(false)} />
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold">Ma Commande</h2>
                <p className="text-xs text-gray-400 mt-0.5">{menu.table.name} · N°{menu.table.number}</p>
              </div>
              <button onClick={() => setShowCart(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.map(item => (
                <div key={item.product_id} className="flex items-center gap-3">
                  {item.image && (
                    <img src={item.image} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-primary-500 text-sm font-semibold">
                      {formatCurrency(item.total_price, currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center font-bold text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                      className="w-7 h-7 bg-primary-500 text-white rounded-lg flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600 font-medium">Total</span>
                <span className="text-xl font-bold text-gray-900">{formatCurrency(total, currency)}</span>
              </div>
              <button
                onClick={handleOrder}
                disabled={submitting}
                className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base"
              >
                {submitting
                  ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <>Commander <ShoppingCart className="w-5 h-5" /></>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
