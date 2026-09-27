'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PageHeader } from '@/components/app-shell'
import { api } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { Loader2 } from 'lucide-react'

export default function SettingsPage() {
  const { user, tenant, refresh } = useAuth()
  const [form, setForm] = useState({ name: tenant?.name || '', userName: user?.name || '' })
  const [busy, setBusy] = useState(false)

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try { await api('/tenant', { method: 'PUT', body: form }); await refresh(); toast.success('Pengaturan disimpan') } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Pengaturan Akun" description="Informasi bisnis dan akun Anda." />
      <Card>
        <CardHeader><CardTitle className="text-base">Profil Bisnis</CardTitle><CardDescription>Nama bisnis ditampilkan di dashboard dan invoice.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2"><Label>Nama Bisnis</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="settings-business-name" /></div>
            <div className="space-y-2"><Label>Nama Anda</Label><Input value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} data-testid="settings-user-name" /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={user?.email || ''} disabled /></div>
            <div className="space-y-2"><Label>Tenant ID</Label><Input value={tenant?.id || ''} disabled className="font-mono text-xs" /></div>
            <Button type="submit" disabled={busy} data-testid="settings-save">{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Simpan</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
