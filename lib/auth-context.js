'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken } from '@/lib/api-client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const token = getToken()
    if (!token) { setUser(null); setTenant(null); setLoading(false); return null }
    try {
      const data = await api('/auth/me')
      setUser(data.user); setTenant(data.tenant)
      return data
    } catch (e) {
      if (e.status === 401) setToken(null)
      setUser(null); setTenant(null)
      return null
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const login = async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } })
    setToken(data.token); setUser(data.user); setTenant(data.tenant)
    return data
  }

  const register = async (payload) => {
    const data = await api('/auth/register', { method: 'POST', body: payload })
    setToken(data.token); setUser(data.user); setTenant(data.tenant)
    return data
  }

  const logout = () => { setToken(null); setUser(null); setTenant(null) }

  return (
    <AuthContext.Provider value={{ user, tenant, loading, login, register, logout, refresh, setTenant }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
