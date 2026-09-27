'use client'

import React, { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/app-shell'
import { api, formatDateTime } from '@/lib/api-client'
import { ArrowLeft, Save, Loader2, Plus, Pencil, Trash2, Copy, Check, Globe, BookOpen, Code2, MessageSquare, Settings2, ExternalLink, Send, Bot, FlaskConical, User } from 'lucide-react'

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#111827']

function ChatbotDetail() {
  const { id } = useParams()
  const router = useRouter()
  const sp = useSearchParams()
  const [bot, setBot] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState(sp.get('tab') || 'general')

  useEffect(() => {
    api(`/chatbots/${id}`).then((b) => { setBot(b); setForm(b) }).catch((e) => { toast.error(e.message); router.push('/dashboard/chatbots') })
  }, [id, router])

  const save = async (patch) => {
    setSaving(true)
    try {
      const updated = await api(`/chatbots/${id}`, { method: 'PUT', body: patch || form })
      setBot(updated); setForm(updated)
      toast.success('Perubahan disimpan')
      return updated
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  const remove = async () => {
    try { await api(`/chatbots/${id}`, { method: 'DELETE' }); toast.success('Chatbot dihapus'); router.push('/dashboard/chatbots') } catch (e) { toast.error(e.message) }
  }

  if (!bot || !form) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-10 w-full" /><Skeleton className="h-96" /></div>

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div>
      <Link href="/dashboard/chatbots" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="h-4 w-4" /> Semua chatbot</Link>
      <PageHeader
        title={<span className="flex items-center gap-3"><span className="h-10 w-10 rounded-xl text-white flex items-center justify-center font-bold overflow-hidden" style={{ background: bot.primaryColor }}>{bot.avatarUrl ? <img src={bot.avatarUrl} alt="" className="h-full w-full object-cover" /> : bot.name.charAt(0).toUpperCase()}</span>{bot.name}<Badge variant={bot.isActive !== false ? 'secondary' : 'outline'} className={bot.isActive !== false ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}>{bot.isActive !== false ? 'Aktif' : 'Nonaktif'}</Badge></span>}
        description={<span className="font-mono text-xs">Bot ID: {bot.id}</span>}
        actions={<>
          <Button variant="outline" asChild><a href={`/preview/${bot.id}`} target="_blank" rel="noreferrer" data-testid="preview-btn"><ExternalLink className="h-4 w-4 mr-2" />Preview Widget</a></Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="outline" className="text-destructive hover:text-destructive" data-testid="delete-bot-btn"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Hapus chatbot ini?</AlertDialogTitle><AlertDialogDescription>Widget yang sudah terpasang akan berhenti bekerja. Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-destructive hover:bg-destructive/90" data-testid="confirm-delete-bot">Hapus</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="general" data-testid="tab-general"><Settings2 className="h-4 w-4 mr-1.5" />Umum</TabsTrigger>
          <TabsTrigger value="knowledge" data-testid="tab-knowledge"><BookOpen className="h-4 w-4 mr-1.5" />Knowledge Base <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">{bot.knowledgeBase?.length || 0}</Badge></TabsTrigger>
          <TabsTrigger value="domains" data-testid="tab-domains"><Globe className="h-4 w-4 mr-1.5" />Domain</TabsTrigger>
          <TabsTrigger value="embed" data-testid="tab-embed"><Code2 className="h-4 w-4 mr-1.5" />Embed</TabsTrigger>
          <TabsTrigger value="test" data-testid="tab-test"><FlaskConical className="h-4 w-4 mr-1.5" />Uji Coba</TabsTrigger>
          <TabsTrigger value="conversations" data-testid="tab-conversations"><MessageSquare className="h-4 w-4 mr-1.5" />Percakapan</TabsTrigger>
        </TabsList>

        {/* GENERAL */}
        <TabsContent value="general" className="mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Identitas & Persona</CardTitle><CardDescription>Atur bagaimana chatbot memperkenalkan diri dan berperilaku.</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Nama Chatbot</Label><Input value={form.name} onChange={(e) => set('name', e.target.value)} data-testid="bot-name-input" /></div>
                  <div className="space-y-2"><Label>URL Avatar (opsional)</Label><Input value={form.avatarUrl || ''} onChange={(e) => set('avatarUrl', e.target.value)} placeholder="https://..." data-testid="bot-avatar-input" /></div>
                </div>
                <div className="space-y-2"><Label>Pesan Sambutan</Label><Input value={form.welcomeMessage || ''} onChange={(e) => set('welcomeMessage', e.target.value)} data-testid="bot-welcome-input" /></div>
                <div className="space-y-2"><Label>Placeholder Input</Label><Input value={form.placeholder || ''} onChange={(e) => set('placeholder', e.target.value)} placeholder="Tulis pesan..." /></div>
                <div className="space-y-2">
                  <Label>System Prompt (Persona & Instruksi)</Label>
                  <Textarea rows={8} value={form.systemPrompt || ''} onChange={(e) => set('systemPrompt', e.target.value)} placeholder="Contoh: Kamu adalah asisten toko online Budi Fashion. Jawab ramah, gunakan bahasa santai, fokus membantu pelanggan memilih produk dan menjelaskan cara pemesanan." data-testid="bot-prompt-input" />
                  <p className="text-xs text-muted-foreground">Instruksi ini menentukan karakter, gaya bahasa, dan batasan chatbot. Knowledge base akan otomatis ditambahkan.</p>
                </div>
              </CardContent>
            </Card>
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Tampilan Widget</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label>Warna Utama</Label>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map((c) => <button key={c} type="button" onClick={() => set('primaryColor', c)} className={`h-8 w-8 rounded-full border-2 ${form.primaryColor === c ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ background: c }} data-testid={`color-${c.slice(1)}`} />)}
                      <Input type="color" value={form.primaryColor || '#4f46e5'} onChange={(e) => set('primaryColor', e.target.value)} className="h-8 w-12 p-0.5" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Posisi</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[['bottom-right', 'Kanan Bawah'], ['bottom-left', 'Kiri Bawah']].map(([v, l]) => <Button key={v} type="button" variant={form.position === v ? 'default' : 'outline'} size="sm" onClick={() => set('position', v)}>{l}</Button>)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div><div className="text-sm font-medium">Status Aktif</div><div className="text-xs text-muted-foreground">Nonaktifkan untuk menghentikan widget</div></div>
                    <Switch checked={form.isActive !== false} onCheckedChange={(v) => set('isActive', v)} data-testid="bot-active-switch" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Pratinjau</CardTitle></CardHeader>
                <CardContent>
                  <div className="rounded-xl border overflow-hidden shadow-sm text-sm">
                    <div className="px-3 py-2.5 text-white flex items-center gap-2" style={{ background: form.primaryColor }}>
                      <div className="h-8 w-8 rounded-full bg-white/25 flex items-center justify-center font-bold overflow-hidden">{form.avatarUrl ? <img src={form.avatarUrl} alt="" className="h-full w-full object-cover" /> : (form.name || 'B').charAt(0).toUpperCase()}</div>
                      <div><div className="font-semibold text-[13px] leading-tight">{form.name || 'Chatbot'}</div><div className="text-[10px] opacity-90">Online</div></div>
                    </div>
                    <div className="p-3 bg-muted/50 space-y-2">
                      <div className="bg-white border rounded-xl rounded-bl-sm px-3 py-2 text-xs max-w-[85%]">{form.welcomeMessage || 'Halo!'}</div>
                      <div className="text-white rounded-xl rounded-br-sm px-3 py-2 text-xs max-w-[85%] ml-auto" style={{ background: form.primaryColor }}>Halo, saya mau tanya</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          <div className="flex justify-end mt-6"><Button onClick={() => save()} disabled={saving} data-testid="save-general-btn">{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Simpan Perubahan</Button></div>
        </TabsContent>

        {/* KNOWLEDGE */}
        <TabsContent value="knowledge" className="mt-6"><KnowledgeTab bot={bot} save={save} saving={saving} /></TabsContent>

        {/* DOMAINS */}
        <TabsContent value="domains" className="mt-6"><DomainsTab bot={bot} save={save} saving={saving} /></TabsContent>

        {/* EMBED */}
        <TabsContent value="embed" className="mt-6"><EmbedTab bot={bot} /></TabsContent>

        {/* TEST */}
        <TabsContent value="test" className="mt-6"><TestChatTab bot={bot} /></TabsContent>

        {/* CONVERSATIONS */}
        <TabsContent value="conversations" className="mt-6"><ConversationsTab bot={bot} initialSession={sp.get('session')} /></TabsContent>
      </Tabs>
    </div>
  )
}

function KnowledgeTab({ bot, save, saving }) {
  const [items, setItems] = useState(bot.knowledgeBase || [])
  const [editing, setEditing] = useState(null)
  useEffect(() => setItems(bot.knowledgeBase || []), [bot])

  const persist = async (next) => { setItems(next); await save({ knowledgeBase: next }) }
  const submit = async (e) => {
    e.preventDefault()
    if (!editing.content?.trim()) return toast.error('Konten wajib diisi')
    const next = editing.id ? items.map((k) => (k.id === editing.id ? editing : k)) : [...items, { ...editing, id: crypto.randomUUID() }]
    await persist(next); setEditing(null)
  }
  const total = items.reduce((s, k) => s + (k.content?.length || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="font-semibold">Knowledge Base</h2><p className="text-sm text-muted-foreground">Informasi bisnis yang menjadi sumber jawaban chatbot. {total.toLocaleString('id-ID')} karakter.</p></div>
        <Button onClick={() => setEditing({ title: '', content: '' })} data-testid="add-kb-btn"><Plus className="h-4 w-4 mr-2" />Tambah Entri</Button>
      </div>
      {items.length === 0 ? (
        <Card><CardContent className="py-14 text-center text-muted-foreground text-sm"><BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />Belum ada entri. Tambahkan FAQ, info produk, jam operasional, kebijakan, dsb.</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((k) => (
            <Card key={k.id} data-testid={`kb-item-${k.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">{k.title || 'Tanpa judul'}</h3>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(k)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => persist(items.filter((x) => x.id !== k.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-4 whitespace-pre-wrap">{k.content}</p>
                <div className="text-xs text-muted-foreground mt-3">{k.content?.length || 0} karakter</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={submit}>
            <DialogHeader><DialogTitle>{editing?.id ? 'Edit Entri' : 'Tambah Entri Knowledge Base'}</DialogTitle><DialogDescription>Tulis informasi dalam bahasa natural. Chatbot akan menggunakannya untuk menjawab.</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Judul</Label><Input value={editing?.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Contoh: Jam Operasional" data-testid="kb-title-input" /></div>
              <div className="space-y-2"><Label>Konten</Label><Textarea rows={10} value={editing?.content || ''} onChange={(e) => setEditing({ ...editing, content: e.target.value })} placeholder="Toko buka Senin-Sabtu 09.00-21.00 WIB..." data-testid="kb-content-input" /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setEditing(null)}>Batal</Button><Button type="submit" disabled={saving} data-testid="kb-save-btn">{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Simpan</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DomainsTab({ bot, save, saving }) {
  const [text, setText] = useState((bot.allowedDomains || []).join('\n'))
  useEffect(() => setText((bot.allowedDomains || []).join('\n')), [bot])
  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle className="text-base">Domain Whitelist</CardTitle><CardDescription>Hanya website dengan domain di daftar ini yang dapat memuat widget. Kosongkan untuk mengizinkan semua domain.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Daftar domain (satu per baris)</Label>
          <Textarea rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={'tokobudi.com\nwww.tokobudi.com\n*.tokobudi.id'} className="font-mono text-sm" data-testid="domains-textarea" />
          <p className="text-xs text-muted-foreground">Gunakan <code>*.domain.com</code> untuk mengizinkan semua subdomain. Domain platform ini selalu diizinkan untuk keperluan preview.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(bot.allowedDomains || []).length === 0 ? <Badge variant="outline">Semua domain diizinkan</Badge> : bot.allowedDomains.map((d) => <Badge key={d} variant="secondary" className="font-mono">{d}</Badge>)}
        </div>
        <Button onClick={() => save({ allowedDomains: text })} disabled={saving} data-testid="save-domains-btn">{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Simpan Domain</Button>
      </CardContent>
    </Card>
  )
}

function EmbedTab({ bot }) {
  const [copied, setCopied] = useState(false)
  const base = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_URL || window.location.origin) : ''
  const code = `<script src="${base}/api/widget.js" data-bot-id="${bot.id}" async></script>`
  const copy = async () => { try { await navigator.clipboard.writeText(code); setCopied(true); toast.success('Embed code disalin'); setTimeout(() => setCopied(false), 2000) } catch { toast.error('Gagal menyalin') } }
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Embed Code</CardTitle><CardDescription>Tempel kode berikut sebelum tag <code>&lt;/body&gt;</code> di setiap halaman website Anda.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <pre className="rounded-xl bg-slate-950 text-emerald-300 p-5 text-sm overflow-x-auto font-mono whitespace-pre-wrap break-all" data-testid="embed-code">{code}</pre>
            <Button size="sm" variant="secondary" className="absolute top-3 right-3" onClick={copy} data-testid="copy-embed-btn">{copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}{copied ? 'Disalin' : 'Salin'}</Button>
          </div>
          <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-2">
            <p className="font-medium">Panduan pemasangan:</p>
            <ol className="list-decimal ml-5 space-y-1 text-muted-foreground">
              <li>Salin embed code di atas.</li>
              <li>Buka file HTML/template website Anda (WordPress: Appearance → Theme Editor → footer.php, atau gunakan plugin header/footer script).</li>
              <li>Tempel kode sebelum <code>&lt;/body&gt;</code>, simpan, lalu refresh website.</li>
              <li>Pastikan domain website sudah terdaftar di tab <b>Domain</b> (jika whitelist diaktifkan).</li>
            </ol>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Coba Langsung</CardTitle><CardDescription>Lihat widget berjalan di halaman contoh.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" asChild><a href={`/preview/${bot.id}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-2" />Buka Halaman Preview</a></Button>
          <p className="text-xs text-muted-foreground">Halaman preview mensimulasikan website klien dengan widget terpasang.</p>
          <div className="text-xs space-y-1 pt-2 border-t">
            <div className="flex justify-between"><span className="text-muted-foreground">Bot ID</span><span className="font-mono">{bot.id.slice(0, 8)}...</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Endpoint</span><span className="font-mono">/api/v1/chat</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Ukuran script</span><span>~9 KB, zero-dependency</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function TestChatTab({ bot }) {
  const [messages, setMessages] = useState(bot.welcomeMessage ? [{ role: 'assistant', content: bot.welcomeMessage }] : [])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (e) => {
    e?.preventDefault()
    const text = input.trim(); if (!text || busy) return
    setInput(''); setBusy(true)
    setMessages((m) => [...m, { role: 'user', content: text }, { role: 'assistant', content: '', streaming: true }])
    try {
      const res = await fetch('/api/v1/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ botId: bot.id, sessionId, message: text, origin: window.location.origin, pageUrl: 'dashboard-test' }) })
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'Gagal') }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ''
      while (true) {
        const { value, done } = await reader.read(); if (done) break
        buf += dec.decode(value, { stream: true })
        const parts = buf.split('\n\n'); buf = parts.pop()
        for (const rec of parts) {
          const ev = (rec.match(/^event: (.+)$/m) || [])[1]; const dl = (rec.match(/^data: (.+)$/m) || [])[1]; if (!dl) continue
          let data; try { data = JSON.parse(dl) } catch { continue }
          if (ev === 'meta') setSessionId(data.sessionId)
          if (ev === 'delta') setMessages((m) => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], content: c[c.length - 1].content + data }; return c })
          if (ev === 'error') throw new Error(data.message)
        }
      }
      setMessages((m) => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], streaming: false }; return c })
    } catch (err) {
      setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: 'assistant', content: err.message, error: true }; return c })
    } finally { setBusy(false) }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 flex flex-col h-[600px]">
        <CardHeader className="border-b py-3"><CardTitle className="text-base flex items-center gap-2"><Bot className="h-4 w-4" />Uji Coba {bot.name}<Badge variant="outline" className="ml-auto font-normal text-xs">Pesan uji coba dihitung dalam kuota</Badge></CardTitle></CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30" data-testid="test-chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role !== 'user' && <div className="h-7 w-7 rounded-full text-white text-xs flex items-center justify-center shrink-0 mt-1" style={{ background: bot.primaryColor }}>{bot.name.charAt(0)}</div>}
              <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'text-white rounded-br-sm' : m.error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-white border rounded-bl-sm'}`} style={m.role === 'user' ? { background: bot.primaryColor } : {}}>
                {m.content || (m.streaming ? <span className="inline-flex gap-1"><span className="h-1.5 w-1.5 bg-muted-foreground/60 rounded-full animate-bounce" /><span className="h-1.5 w-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:150ms]" /><span className="h-1.5 w-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:300ms]" /></span> : '')}
              </div>
              {m.role === 'user' && <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1"><User className="h-3.5 w-3.5" /></div>}
            </div>
          ))}
          <div ref={endRef} />
        </CardContent>
        <form onSubmit={send} className="border-t p-3 flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={bot.placeholder || 'Tulis pesan...'} disabled={busy} data-testid="test-chat-input" />
          <Button type="submit" disabled={busy || !input.trim()} data-testid="test-chat-send">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
        </form>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Tips Pengujian</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>Coba tanyakan hal yang ada di knowledge base untuk memastikan chatbot menjawab dengan benar.</p>
          <p>Tanyakan sesuatu di luar knowledge base untuk melihat bagaimana chatbot menangani ketidaktahuan.</p>
          <p>Ubah <b>System Prompt</b> di tab Umum untuk menyesuaikan gaya bahasa.</p>
          {sessionId && <div className="text-xs pt-2 border-t">Session: <span className="font-mono">{sessionId.slice(0, 8)}...</span><Button variant="link" size="sm" className="h-auto p-0 ml-2" onClick={() => { setSessionId(null); setMessages(bot.welcomeMessage ? [{ role: 'assistant', content: bot.welcomeMessage }] : []) }}>Reset</Button></div>}
        </CardContent>
      </Card>
    </div>
  )
}

function ConversationsTab({ bot, initialSession }) {
  const [sessions, setSessions] = useState(null)
  const [active, setActive] = useState(initialSession || null)
  const [detail, setDetail] = useState(null)

  useEffect(() => { api(`/chatbots/${bot.id}/conversations`).then(setSessions).catch((e) => toast.error(e.message)) }, [bot.id])
  useEffect(() => {
    if (!active) return setDetail(null)
    api(`/chatbots/${bot.id}/conversations/${active}`).then(setDetail).catch((e) => toast.error(e.message))
  }, [active, bot.id])

  if (!sessions) return <Skeleton className="h-96" />
  if (sessions.length === 0) return <Card><CardContent className="py-14 text-center text-muted-foreground text-sm"><MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />Belum ada percakapan untuk chatbot ini.</CardContent></Card>

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="h-[600px] overflow-hidden flex flex-col">
        <CardHeader className="py-3 border-b"><CardTitle className="text-base">{sessions.length} Percakapan</CardTitle></CardHeader>
        <div className="overflow-y-auto divide-y flex-1">
          {sessions.map((s) => (
            <button key={s.id} onClick={() => setActive(s.id)} className={`w-full text-left px-4 py-3 hover:bg-muted/60 ${active === s.id ? 'bg-muted' : ''}`} data-testid={`session-${s.id}`}>
              <div className="text-sm font-medium truncate">{s.lastMessage || 'Percakapan baru'}</div>
              <div className="text-xs text-muted-foreground mt-0.5 flex justify-between"><span>{s.origin} • {s.messageCount} pesan</span><span>{formatDateTime(s.lastMessageAt)}</span></div>
            </button>
          ))}
        </div>
      </Card>
      <Card className="lg:col-span-2 h-[600px] flex flex-col">
        {!detail ? <CardContent className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Pilih percakapan untuk melihat detail</CardContent> : (
          <>
            <CardHeader className="py-3 border-b"><CardTitle className="text-base">Sesi {detail.session.id.slice(0, 8)}</CardTitle><CardDescription>{detail.session.origin} • {detail.session.pageUrl || '-'} • Dimulai {formatDateTime(detail.session.createdAt)}</CardDescription></CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
              {detail.messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'text-white rounded-br-sm' : 'bg-white border rounded-bl-sm'}`} style={m.role === 'user' ? { background: bot.primaryColor } : {}}>
                    {m.content}
                    <div className={`text-[10px] mt-1 ${m.role === 'user' ? 'text-white/70' : 'text-muted-foreground'}`}>{formatDateTime(m.createdAt)}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={<Skeleton className="h-96" />}><ChatbotDetail /></Suspense>
}
