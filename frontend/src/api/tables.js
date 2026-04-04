import api from './axios'

export const getTables        = ()        => api.get('/admin/tables')
export const createTable      = (data)    => api.post('/admin/tables', data)
export const updateTable      = (id, data)=> api.put(`/admin/tables/${id}`, data)
export const deleteTable      = (id)      => api.delete(`/admin/tables/${id}`)
export const regenerateQr     = (id)      => api.post(`/admin/tables/${id}/regenerate-qr`)
