'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { AppShell, LoadingScreen } from '@/components/app-shell'
import { LayoutDashboard, Bot, CreditCard, Settings } from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Ringkasan', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/chatbots', label: 'Chatbot', icon: Bot },
  { href: '/dashboard/billing', label: 'Langganan', icon: CreditCard },
  { href: '/dashboard/settings', label: 'Pengaturan', icon: Settings },
]

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) router.replace('/login')
    else if (user.role === 'admin') router.replace('/admin')
  }, [user, loading, router])

  if (loading || !user || user.role === 'admin') return <LoadingScreen />
  return <AppShell nav={NAV}>{children}</AppShell>
}
