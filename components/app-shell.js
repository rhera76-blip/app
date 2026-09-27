'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Logo } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import { LogOut, Menu, X, ExternalLink } from 'lucide-react'

export function AppShell({ nav = [], children, badge }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, tenant, logout } = useAuth()
  const [open, setOpen] = useState(false)

  const isActive = (href, exact) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + '/'))

  const doLogout = () => { logout(); router.push('/login') }

  const Nav = () => (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {nav.map((item) => (
        <Link key={item.href} href={item.href} onClick={() => setOpen(false)} data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
          className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            isActive(item.href, item.exact) ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground')}>
          <item.icon className="h-4 w-4" />{item.label}
        </Link>
      ))}
    </nav>
  )

  const UserBox = () => (
    <div className="border-t border-sidebar-border p-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-sidebar-primary text-white flex items-center justify-center font-semibold text-sm shrink-0">{(user?.name || 'U').charAt(0).toUpperCase()}</div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-white truncate">{user?.name}</div>
          <div className="text-xs text-sidebar-foreground/70 truncate">{tenant?.name || user?.email}</div>
        </div>
        <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:text-white hover:bg-sidebar-accent" onClick={doLogout} title="Keluar" data-testid="logout-btn"><LogOut className="h-4 w-4" /></Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-30">
        <div className="h-16 flex items-center px-5 border-b border-sidebar-border justify-between">
          <Link href="/"><Logo light /></Link>
          {badge && <Badge className="bg-sidebar-primary text-white text-[10px]">{badge}</Badge>}
        </div>
        <Nav />
        <div className="px-4 pb-3">
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-sidebar-foreground/60 hover:text-white"><ExternalLink className="h-3 w-3" /> Lihat landing page</a>
        </div>
        <UserBox />
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 h-14 bg-sidebar text-white flex items-center justify-between px-4">
        <Logo light />
        <Button variant="ghost" size="icon" className="text-white" onClick={() => setOpen(!open)}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</Button>
      </div>
      {open && (
        <div className="md:hidden fixed inset-0 z-20 bg-sidebar text-sidebar-foreground pt-14 flex flex-col">
          <Nav /><UserBox />
        </div>
      )}

      <main className="flex-1 md:ml-64 pt-14 md:pt-0 min-w-0">
        <div className="container max-w-6xl py-8">{children}</div>
      </main>
    </div>
  )
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({ title, value, hint, icon: Icon, accent }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        {Icon && <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', accent || 'bg-primary/10 text-primary')}><Icon className="h-4 w-4" /></div>}
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  )
}

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm">Memuat...</span>
      </div>
    </div>
  )
}
