import api from './axios'

export const platformGetStats           = ()              => api.get('/platform/stats')
export const platformGetRestaurants     = (params)        => api.get('/platform/restaurants', { params })
export const platformCreateRestaurant   = (data)          => api.post('/platform/restaurants', data)
export const platformToggleStatus       = (id)            => api.patch(`/platform/restaurants/${id}/status`)
export const platformUpdateSubscription = (id, data)      => api.patch(`/platform/restaurants/${id}/subscription`, data)
export const platformDeleteRestaurant   = (id)            => api.delete(`/platform/restaurants/${id}`)
export const platformGetSettings        = ()              => api.get('/platform/settings')
export const platformUpdateSettings     = (data)          => api.post('/platform/settings', data)
export const platformListViewers        = ()              => api.get('/platform/viewers')
export const platformCreateViewer       = (data)          => api.post('/platform/viewers', data)
export const platformDeleteViewer       = (id)            => api.delete(`/platform/viewers/${id}`)
