import api from './axios'

// Public
export const placeTableOrder    = (slug, tableId, token, data) =>
  api.post(`/menu/${slug}/${tableId}/order`, data, { headers: { 'X-QR-Token': token } })

export const placeDeliveryOrder = (slug, data) =>
  api.post(`/orders/${slug}`, data)

export const trackOrder         = (orderNumber) =>
  api.get(`/orders/${orderNumber}/track`)

// Kitchen
export const getKitchenOrders   = ()           => api.get('/kitchen/orders')
export const updateKitchenStatus = (id, status) =>
  api.patch(`/kitchen/orders/${id}/status`, { status })
export const markItemReady       = (orderId, itemId) =>
  api.patch(`/kitchen/orders/${orderId}/items/${itemId}/ready`)

// Admin
export const getAdminOrders      = (params)    => api.get('/admin/orders', { params })
export const getOrderDetail      = (id)         => api.get(`/admin/orders/${id}`)
export const updateOrderStatus   = (id, status) =>
  api.patch(`/admin/orders/${id}/status`, { status })
export const processPayment      = (id, data)   =>
  api.post(`/admin/orders/${id}/payment`, data)
// Cashier
export const getActiveOrders        = ()            => api.get('/cashier/orders')
export const cashierUpdateStatus    = (id, status)  =>
  api.patch(`/cashier/orders/${id}/status`, { status })
export const cashierProcessPayment  = (id, data)    =>
  api.post(`/cashier/orders/${id}/payment`, data)

// Admin
export const getDashboardStats   = ()           => api.get('/admin/stats')
