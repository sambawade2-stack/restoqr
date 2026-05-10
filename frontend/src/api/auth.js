import api from './axios'

export const login          = (data) => api.post('/auth/login',    data, { _silent: true })
export const register       = (data) => api.post('/auth/register', data)
export const logout         = ()     => api.post('/auth/logout')
export const me             = ()     => api.get('/auth/me')
export const changePassword = (data) => api.patch('/auth/password', data)
