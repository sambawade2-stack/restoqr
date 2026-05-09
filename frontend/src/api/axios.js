import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
  withCredentials: false,
})

// Attach Bearer token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Fix storage URLs: backend returns absolute URLs (APP_URL=http://localhost:8000)
// but nginx serves /storage/ directly — make them relative so they work everywhere
function fixStorageUrls(data) {
  if (!data || typeof data !== 'object') return data
  const str = JSON.stringify(data)
  const fixed = str.replace(/"(https?:\/\/[^"]*\/storage\/)/g, '"/storage/')
  return JSON.parse(fixed)
}

// Handle 401 (session expirée) et 403 SaaS (restaurant suspendu / abo expiré)
api.interceptors.response.use(
  res => {
    if (res.data) res.data = fixStorageUrls(res.data)
    return res
  },
  err => {
    const status = err.response?.status
    const code   = err.response?.data?.code

    if (status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
      return Promise.reject(err)
    }

    if (status === 403) {
      if (code === 'subscription_expired') {
        toast.error('Abonnement expiré — contactez le support pour renouveler.', {
          id: 'subscription_expired',
          duration: 6000,
        })
      } else if (code === 'restaurant_suspended') {
        // Déconnecter immédiatement et rediriger
        localStorage.removeItem('token')
        toast.error('Restaurant suspendu. Contactez le support.', {
          id: 'restaurant_suspended',
          duration: 4000,
        })
        setTimeout(() => { window.location.href = '/login' }, 1500)
      }
    }

    return Promise.reject(err)
  }
)

export default api
