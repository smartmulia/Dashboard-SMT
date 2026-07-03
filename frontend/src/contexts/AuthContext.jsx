import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me')
      setUser(data.data)
    } catch {
      setUser(null)
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) fetchMe()
    else setLoading(false)
  }, [fetchMe])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', data.data.token)
    setUser(data.data.user)
    toast.success(`Selamat datang, ${data.data.user.nama}!`)
    return data.data.user
  }

  const logout = async () => {
    try { await api.post('/auth/logout') } catch {}
    localStorage.removeItem('token')
    setUser(null)
    toast.success('Berhasil logout')
  }

  const isAdmin = () => user?.role === 'ADMIN'
  const isSuperUser = () => ['ADMIN', 'SUPER_USER'].includes(user?.role)
  const canSeeCogs = () => ['ADMIN', 'SUPER_USER'].includes(user?.role)
  const canDelete = () => ['ADMIN', 'SUPER_USER'].includes(user?.role)
  const canApprove = () => user?.role === 'ADMIN'
  const canManageUsers = () => user?.role === 'ADMIN'
  const isKatalogOnly = () => user?.role === 'KATALOG_USER'

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, fetchMe, isAdmin, isSuperUser, canSeeCogs, canDelete, canApprove, canManageUsers, isKatalogOnly }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus digunakan di dalam AuthProvider')
  return ctx
}
