import axios from 'axios'


const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const api = axios.create({
  baseURL: API_URL,  // ← Plus de /api ici
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('dm_token')
  if (token && !config.url.includes('/auth/login')) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dm_token')
      window.location.reload()
    }
    return Promise.reject(err)
  }
)

export const login  = (u, p) => api.post('/auth/login', { username: u, password: p })
export const query  = (q, v) => api.post('/query', { question: q, generate_visual: v })
export const health = ()      => api.get('/health')
// ── Gestion des entreprises (tenants) ──
export const getTenants   = ()     => api.get('/tenants')
export const createTenant = (data) => api.post('/tenants', data)

// ── Gestion des utilisateurs ──
export const getUsers   = ()         => api.get('/users')
export const createUser = (data)     => api.post('/users', data)
export const toggleUser = (username) => api.patch(`/users/${username}/toggle`)

export default api
