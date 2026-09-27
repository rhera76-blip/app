'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/app-shell'
import { api, formatDate } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { Plus, Bot, MessageSquare, Globe, BookOpen, Settings2, Loader2 } from 'lucide-react'

export default function ChatbotsPage() {
  const router = useRouter()
  const { tenant } = useAuth()
  const [bots, setBots] = useState(null)
  const [creating, setCreating] = useState(false)

  const load = () => api('/chatbots').then(setBots).catch((e) => toast.error(e.message))
  useEffect(() => { load() }, [])

  const create = async () => {
    setCreating(true)
    try {
      const bot = await api('/chatbots', { method: 'POST', body: { name: `Chatbot ${(bots?.length || 0) + 1}` } })
      toast.success('Chatbot baru dibuat')
      router.push(`/dashboard/chatbots/${bot.id}`)
    } catch (e) { toast.error(e.message) } finally { setCreating(false) }
  }

  const max = tenant?.planDetails?.maxChatbots || 1

  return (
    <div>
      <PageHeader title="Chatbot" description={`${bots?.length ?? 0} dari ${max >= 999 ? '∞' : max} chatbot (paket ${tenant?.planDetails?.name || '-'})`}
        actions={<Button onClick={create} disabled={creating} data-testid="create-chatbot-btn">{creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Chatbot Baru</Button>} />

      {!bots ? (
        <div className="grid md:grid-cols-2 gap-4">{[1, 2].map((i) => <Skeleton key={i} className="h-44" />)}</div>
      ) : bots.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground"><Bot className="h-10 w-10 mx-auto mb-3 opacity-40" />Belum ada chatbot. Klik "Chatbot Baru" untuk memulai.</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {bots.map((b) => (
            <Card key={b.id} className="hover:shadow-md transition-shadow" data-testid={`chatbot-card-${b.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 overflow-hidden" style={{ background: b.primaryColor || '#4f46e5' }}>
                    {b.avatarUrl ? <img src={b.avatarUrl} alt="" className="h-full w-full object-cover" /> : (b.name || 'B').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{b.name}</h3>
                      <Badge variant={b.isActive !== false ? 'secondary' : 'outline'} className={b.isActive !== false ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}>{b.isActive !== false ? 'Aktif' : 'Nonaktif'}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{b.welcomeMessage || 'Tanpa pesan sambutan'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" />{b.totalMessages || 0} pesan</div>
                  <div className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" />{b.knowledgeBase?.length || 0} KB</div>
                  <div className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />{b.allowedDomains?.length ? `${b.allowedDomains.length} domain` : 'Semua domain'}</div>
                </div>
                <div className="flex items-center justify-between mt-5 pt-4 border-t">
                  <span className="text-xs text-muted-foreground">Dibuat {formatDate(b.createdAt)}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild><a href={`/preview/${b.id}`} target="_blank" rel="noreferrer">Preview</a></Button>
                    <Button size="sm" asChild data-testid={`configure-bot-${b.id}`}><Link href={`/dashboard/chatbots/${b.id}`}><Settings2 className="h-3.5 w-3.5 mr-1.5" />Konfigurasi</Link></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
