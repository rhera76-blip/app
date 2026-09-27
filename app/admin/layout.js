'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { AppShell, LoadingScreen } from '@/components/app-shell'
import { LayoutDashboard, Building2, Receipt, Cpu } from 'lucide-react'

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/tenants', label: 'Tenant', icon: Building2 },
  { href: '/admin/payments', label: 'Pembayaran', icon: Receipt },
  { href: '/admin/settings', label: 'Konfigurasi AI', icon: Cpu },
]

export default function AdminLayout({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) router.replace('/login')
    else if (user.role !== 'admin') router.replace('/dashboard')
  }, [user, loading, router])

  if (loading || !user || user.role !== 'admin') return <LoadingScreen />
  return <AppShell nav={NAV} badge="MASTER ADMIN">{children}</AppShell>
}
