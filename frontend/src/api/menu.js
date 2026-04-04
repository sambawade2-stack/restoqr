import api from './axios'

// Public
export const getTableMenu    = (slug, tableId, token) =>
  api.get(`/menu/${slug}/${tableId}`, { params: { token } })

export const getDeliveryMenu = (slug) => api.get(`/menu/${slug}`)

// Admin
export const getCategories   = ()          => api.get('/admin/categories')
export const createCategory  = (data)      => api.post('/admin/categories', data)
export const updateCategory  = (id, data)  => api.put(`/admin/categories/${id}`, data)
export const deleteCategory  = (id)        => api.delete(`/admin/categories/${id}`)

export const getProducts     = ()          => api.get('/admin/products')
export const createProduct   = (data)      => api.post('/admin/products', data, {
  headers: { 'Content-Type': 'multipart/form-data' },
})
export const updateProduct   = (id, data)  => api.post(`/admin/products/${id}`, data, {
  headers: { 'Content-Type': 'multipart/form-data' },
})
export const deleteProduct   = (id)        => api.delete(`/admin/products/${id}`)
