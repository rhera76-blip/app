'use client'

import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/app-shell'
import { api, formatDate } from '@/lib/api-client'
import { PLAN_LIST } from '@/lib/plans'
import { Search, Loader2, Settings2 } from 'lucide-react'

export default function AdminTenants() {
  const [tenants, setTenants] = useState(null)
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState(null)
  const [form, setForm] = useState({})
  const [busy, setBusy] = useState(false)

  const load = () => api('/admin/tenants').then(setTenants).catch((e) => toast.error(e.message))
  useEffect(() => { load() }, [])

  const openEdit = (t) => { setEdit(t); setForm({ plan: t.plan, status: t.status, extendDays: '', resetUsage: false }) }
  const submit = async () => {
    setBusy(true)
    try {
      const body = { plan: form.plan, status: form.status }
      if (form.extendDays) body.extendDays = Number(form.extendDays)
      if (form.resetUsage) body.resetUsage = true
      await api(`/admin/tenants/${edit.id}`, { method: 'PUT', body })
      toast.success('Tenant diperbarui'); setEdit(null); load()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const list = (tenants || []).filter((t) => !q || t.name?.toLowerCase().includes(q.toLowerCase()) || t.ownerEmail?.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="space-y-6">
      <PageHeader title="Manajemen Tenant" description={`${tenants?.length ?? 0} bisnis terdaftar`} actions={<div className="relative"><Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" /><Input placeholder="Cari nama / email..." className="pl-9 w-64" value={q} onChange={(e) => setQ(e.target.value)} data-testid="tenant-search" /></div>} />
      <Card>
        <CardContent className="p-0">
          {!tenants ? <div className="p-6"><Skeleton className="h-64" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Bisnis</TableHead><TableHead>Pemilik</TableHead><TableHead>Paket</TableHead><TableHead>Berlaku s/d</TableHead><TableHead>Pemakaian</TableHead><TableHead>Chatbot</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {list.map((t) => (
                  <TableRow key={t.id} data-testid={`tenant-row-${t.id}`}>
                    <TableCell className="font-medium">{t.name}<div className="text-xs text-muted-foreground">Daftar {formatDate(t.createdAt)}</div></TableCell>
                    <TableCell><div className="text-sm">{t.ownerName}</div><div className="text-xs text-muted-foreground">{t.ownerEmail}</div></TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{t.plan}</Badge></TableCell>
                    <TableCell className={t.expired ? 'text-destructive' : ''}>{formatDate(t.planExpiresAt)}{t.expired && <div className="text-xs">Berakhir</div>}</TableCell>
                    <TableCell>{t.messagesUsed || 0} / {t.planDetails?.messageQuota}</TableCell>
                    <TableCell>{t.chatbotCount}</TableCell>
                    <TableCell><Badge variant={t.status === 'active' ? 'secondary' : 'destructive'} className={t.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}>{t.status === 'active' ? 'Aktif' : 'Ditangguhkan'}</Badge></TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => openEdit(t)} data-testid={`edit-tenant-${t.id}`}><Settings2 className="h-3.5 w-3.5 mr-1" />Kelola</Button></TableCell>
                  </TableRow>
                ))}
                {list.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">Tidak ada tenant.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Kelola Tenant: {edit?.name}</DialogTitle><DialogDescription>Ubah paket, status, atau perpanjang masa aktif secara manual.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Paket</Label>
              <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}><SelectTrigger data-testid="tenant-plan-select"><SelectValue /></SelectTrigger><SelectContent>{PLAN_LIST.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger data-testid="tenant-status-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Aktif</SelectItem><SelectItem value="suspended">Ditangguhkan</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Perpanjang (hari)</Label><Input type="number" min="0" placeholder="contoh: 30" value={form.extendDays} onChange={(e) => setForm({ ...form, extendDays: e.target.value })} data-testid="tenant-extend-input" /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.resetUsage} onChange={(e) => setForm({ ...form, resetUsage: e.target.checked })} /> Reset pemakaian pesan bulan ini</label>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Batal</Button><Button onClick={submit} disabled={busy} data-testid="tenant-save-btn">{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
