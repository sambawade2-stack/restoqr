import api from './axios'

export const cashierGetStats      = ()       => api.get('/cashier/stats')
export const cashierGetTables     = ()       => api.get('/cashier/tables')
export const cashierGetCategories = ()       => api.get('/cashier/categories')
export const cashierGetProducts   = ()       => api.get('/cashier/products')
export const cashierCreateOrder   = (data)   => api.post('/cashier/orders', data)
