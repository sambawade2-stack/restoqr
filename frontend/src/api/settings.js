import api from './axios'

export const getSettings     = ()     => api.get('/admin/settings')
export const updateSettings  = (data) => api.post('/admin/settings', data, {
  headers: { 'Content-Type': 'multipart/form-data' },
})
export const getOrderHistory = (date) => api.get('/admin/orders/history', { params: { date } })
