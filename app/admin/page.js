'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader, StatCard } from '@/components/app-shell'
import { api, formatIDR, formatDateTime } from '@/lib/api-client'
import { PLAN_LIST } from '@/lib/plans'
import { Building2, Bot, MessageSquare, Wallet, TrendingUp, Crown } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

const COLORS = ['#94a3b8', '#0ea5e9', '#4f46e5', '#f59e0b']

export default function AdminOverview() {
  const [d, setD] = useState(null)
  useEffect(() => { api('/admin/overview').then(setD).catch((e) => toast.error(e.message)) }, [])
  if (!d) return <div className="space-y-6"><Skeleton className="h-10 w-64" /><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}</div></div>

  const pie = PLAN_LIST.map((p) => ({ name: p.name, value: d.byPlan?.[p.id] || 0 }))

  return (
    <div className="space-y-8">
      <PageHeader title="Master Admin Overview" description="Ringkasan seluruh platform BABEHCHATin." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Tenant" value={d.totalTenants} hint={`${d.activePaid} langganan berbayar aktif`} icon={Building2} />
        <StatCard title="Total Chatbot" value={d.totalChatbots} hint={`${d.totalSessions} sesi percakapan`} icon={Bot} accent="bg-sky-100 text-sky-700" />
        <StatCard title="Total Pesan" value={d.totalMessages?.toLocaleString('id-ID')} hint={`${d.messagesToday} hari ini`} icon={MessageSquare} accent="bg-emerald-100 text-emerald-700" />
        <StatCard title="Pendapatan" value={formatIDR(d.revenue)} hint={`${formatIDR(d.revenueThisMonth)} bulan ini`} icon={Wallet} accent="bg-amber-100 text-amber-700" />
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Crown className="h-4 w-4" />Distribusi Paket</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>{pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend iconType="circle" /></PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Tenant Terbaru</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {d.recentTenants?.length === 0 && <p className="text-sm text-muted-foreground py-4">Belum ada tenant.</p>}
            {d.recentTenants?.map((t) => (
              <div key={t.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0"><div className="text-sm font-medium truncate">{t.name}</div><div className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</div></div>
                <Badge variant="secondary" className="capitalize">{t.plan}</Badge>
              </div>
            ))}
            <div className="pt-3"><Link href="/admin/tenants" className="text-sm text-primary hover:underline">Lihat semua tenant →</Link></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" />Pembayaran Terbaru</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {d.recentPayments?.length === 0 && <p className="text-sm text-muted-foreground py-4">Belum ada pembayaran.</p>}
            {d.recentPayments?.map((p) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0"><div className="text-sm font-medium">{p.planName} • {formatIDR(p.total)}</div><div className="text-xs text-muted-foreground font-mono">{p.merchantRef}</div></div>
                <Badge className={p.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''} variant={p.status === 'PAID' ? 'secondary' : 'outline'}>{p.status}</Badge>
              </div>
            ))}
            <div className="pt-3"><Link href="/admin/payments" className="text-sm text-primary hover:underline">Lihat semua pembayaran →</Link></div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
