import api from './axios'

export const getStaff    = ()          => api.get('/admin/staff')
export const createStaff = (data)      => api.post('/admin/staff', data)
export const updateStaff = (id, data)  => api.patch(`/admin/staff/${id}`, data)
export const deleteStaff = (id)        => api.delete(`/admin/staff/${id}`)
