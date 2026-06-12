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

// Handle 401 (session expirée) et 403 SaaS (restaurant suspendu / abo expiré)
// Les requêtes avec { _silent: true } ne déclenchent pas la déconnexion automatique
// Note: les URLs /storage/ sont déjà renvoyées relatives par le backend (storage_url()).
api.interceptors.response.use(
  res => res,
  err => {
    const status  = err.response?.status
    const code    = err.response?.data?.code
    const silent  = err.config?._silent

    if (status === 401 && !silent) {
      localStorage.removeItem('token')
      window.location.href = '/login'
      return Promise.reject(err)
    }

    if (status === 403 && !silent) {
      if (code === 'subscription_expired') {
        toast.error('Abonnement expiré — contactez le support pour renouveler.', {
          id: 'subscription_expired',
          duration: 6000,
        })
      } else if (code === 'restaurant_suspended') {
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
