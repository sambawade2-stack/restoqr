import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
  withCredentials: true,
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

// Handle 401 — redirect to login
api.interceptors.response.use(
  res => {
    if (res.data) res.data = fixStorageUrls(res.data)
    return res
  },
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
