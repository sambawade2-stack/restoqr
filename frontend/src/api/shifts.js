import api from './axios'

export const getCurrentShift    = ()       => api.get('/cashier/shift')
export const openShift          = ()       => api.post('/cashier/shift/open')
export const closeShift         = (notes)  => api.post('/cashier/shift/close', { notes })
export const getShiftHistory    = ()       => api.get('/cashier/shift/history')
export const getCashierHistory  = (date)   => api.get('/cashier/orders/history', { params: { date } })
