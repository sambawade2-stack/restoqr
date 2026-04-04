import api from './axios'

export const platformGetStats           = ()              => api.get('/platform/stats')
export const platformGetRestaurants     = (params)        => api.get('/platform/restaurants', { params })
export const platformCreateRestaurant   = (data)          => api.post('/platform/restaurants', data)
export const platformToggleStatus       = (id)            => api.patch(`/platform/restaurants/${id}/status`)
export const platformUpdateSubscription = (id, data)      => api.patch(`/platform/restaurants/${id}/subscription`, data)
export const platformDeleteRestaurant   = (id)            => api.delete(`/platform/restaurants/${id}`)
