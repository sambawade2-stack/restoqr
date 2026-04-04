import { create } from 'zustand'

export const useCartStore = create((set, get) => ({
  items:      [],
  restaurant: null,
  table:      null,
  currency:   'FCFA',

  initCart: (restaurant, table) => set({ restaurant, table, currency: restaurant.currency }),

  addItem: (product) => {
    const existing = get().items.find(i => i.product_id === product.id)
    if (existing) {
      set({ items: get().items.map(i =>
        i.product_id === product.id
          ? { ...i, quantity: i.quantity + 1, total_price: i.unit_price * (i.quantity + 1) }
          : i
      )})
    } else {
      set({ items: [...get().items, {
        product_id:  product.id,
        name:        product.name,
        image:       product.image,
        unit_price:  product.price,
        quantity:    1,
        total_price: product.price,
        notes:       '',
      }]})
    }
  },

  removeItem: (productId) =>
    set({ items: get().items.filter(i => i.product_id !== productId) }),

  updateQuantity: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId)
      return
    }
    set({ items: get().items.map(i =>
      i.product_id === productId
        ? { ...i, quantity: qty, total_price: i.unit_price * qty }
        : i
    )})
  },

  updateNotes: (productId, notes) =>
    set({ items: get().items.map(i =>
      i.product_id === productId ? { ...i, notes } : i
    )}),

  clearCart: () => set({ items: [] }),

  getTotal: () => get().items.reduce((sum, i) => sum + i.total_price, 0),

  getCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}))
