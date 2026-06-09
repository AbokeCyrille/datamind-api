import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
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

export default api
