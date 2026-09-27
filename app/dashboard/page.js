'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader, StatCard } from '@/components/app-shell'
import { api, formatDate, formatDateTime, daysLeft } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { MessageSquare, Users, Bot, Zap, ArrowRight, AlertTriangle, Crown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function DashboardHome() {
  const { user } = useAuth()
  const [data, setData] = useState(null)

  useEffect(() => {
    api('/tenant/stats').then(setData).catch((e) => toast.error(e.message))
  }, [])

  if (!data) return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      <Skeleton className="h-72" />
    </div>
  )

  const { tenant, chatbots = [], daily = [], totalSessions, totalMessages, recentSessions = [] } = data
  const plan = tenant?.planDetails || {}
  const used = tenant?.messagesUsed || 0
  const pct = Math.min(100, Math.round((used / (plan.messageQuota || 1)) * 100))
  const left = daysLeft(tenant?.planExpiresAt)
  const botName = (id) => chatbots.find((b) => b.id === id)?.name || 'Chatbot'

  return (
    <div className="space-y-8">
      <PageHeader title={`Halo, ${user?.name?.split(' ')[0]} 👋`} description={`Ringkasan aktivitas chatbot ${tenant?.name}.`}
        actions={<Button asChild data-testid="go-chatbots-btn"><Link href="/dashboard/chatbots">Kelola Chatbot <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>} />

      {(tenant?.expired || left <= 3) && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 p-4 flex items-start gap-3" data-testid="expiry-warning">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm">
            <b>{tenant?.expired ? 'Langganan Anda telah berakhir.' : `Langganan berakhir dalam ${left} hari.`}</b> Chatbot akan berhenti merespons setelah masa aktif habis. Perbarui paket agar layanan tetap berjalan.
          </div>
          <Button size="sm" asChild><Link href="/dashboard/billing">Upgrade</Link></Button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pesan Bulan Ini" value={used.toLocaleString('id-ID')} hint={`dari kuota ${plan.messageQuota?.toLocaleString('id-ID')}`} icon={MessageSquare} />
        <StatCard title="Total Percakapan" value={totalSessions?.toLocaleString('id-ID')} hint="sesi pengunjung" icon={Users} accent="bg-emerald-100 text-emerald-700" />
        <StatCard title="Chatbot Aktif" value={`${chatbots.filter((b) => b.isActive !== false).length}/${chatbots.length}`} hint={`maks ${plan.maxChatbots >= 999 ? '∞' : plan.maxChatbots} di paket ${plan.name}`} icon={Bot} accent="bg-sky-100 text-sky-700" />
        <StatCard title="Total Pesan" value={totalMessages?.toLocaleString('id-ID')} hint="sepanjang waktu" icon={Zap} accent="bg-amber-100 text-amber-700" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Pesan 7 Hari Terakhir</CardTitle><CardDescription>Jumlah pesan pengunjung per hari</CardDescription></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={30} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" name="Pesan" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Crown className="h-4 w-4 text-primary" /> Paket {plan.name}</CardTitle>
              <Badge variant={tenant?.expired ? 'destructive' : 'secondary'}>{tenant?.expired ? 'Berakhir' : 'Aktif'}</Badge>
            </div>
            <CardDescription>Berlaku hingga {formatDate(tenant?.planExpiresAt)} ({left} hari)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5"><span>Kuota pesan</span><span className="font-medium">{used} / {plan.messageQuota}</span></div>
              <Progress value={pct} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1.5">{pct}% terpakai bulan ini</p>
            </div>
            <Button className="w-full" variant={plan.id === 'trial' ? 'default' : 'outline'} asChild data-testid="upgrade-btn"><Link href="/dashboard/billing">{plan.id === 'trial' ? 'Upgrade Paket' : 'Kelola Langganan'}</Link></Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Percakapan Terbaru</CardTitle></CardHeader>
        <CardContent>
          {recentSessions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Belum ada percakapan. Pasang widget di website Anda untuk mulai menerima chat.
              <div className="mt-4"><Button variant="outline" size="sm" asChild><Link href="/dashboard/chatbots">Ambil Embed Code</Link></Button></div>
            </div>
          ) : (
            <div className="divide-y">
              {recentSessions.map((s) => (
                <Link key={s.id} href={`/dashboard/chatbots/${s.chatbotId}?tab=conversations&session=${s.id}`} className="flex items-center gap-4 py-3 hover:bg-muted/50 -mx-2 px-2 rounded-lg">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"><Users className="h-4 w-4 text-muted-foreground" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.lastMessage || 'Percakapan baru'}</div>
                    <div className="text-xs text-muted-foreground">{botName(s.chatbotId)} • {s.origin} • {s.messageCount} pesan</div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(s.lastMessageAt)}</div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
