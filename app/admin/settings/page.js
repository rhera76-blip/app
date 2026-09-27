'use client'

import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/app-shell'
import { api } from '@/lib/api-client'
import { Loader2, Save, Cpu, KeyRound } from 'lucide-react'

const MODELS = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-5'],
  anthropic: ['claude-sonnet-4-6', 'claude-3-5-haiku-20241022'],
  gemini: ['gemini-2.0-flash', 'gemini-1.5-pro'],
}

export default function AdminSettings() {
  const [s, setS] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { api('/admin/settings').then(setS).catch((e) => toast.error(e.message)) }, [])
  if (!s) return <Skeleton className="h-96" />

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try { setS(await api('/admin/settings', { method: 'PUT', body: s })); toast.success('Konfigurasi AI disimpan') } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Konfigurasi AI" description="Pengaturan model LLM global yang digunakan semua chatbot tenant." />
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Cpu className="h-4 w-4" />Model LLM</CardTitle><CardDescription>Semua permintaan dirutekan melalui Emergent Universal Key.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Provider</Label>
                <Select value={s.llmProvider} onValueChange={(v) => setS({ ...s, llmProvider: v, llmModel: MODELS[v][0] })}><SelectTrigger data-testid="llm-provider-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="openai">OpenAI</SelectItem><SelectItem value="anthropic">Anthropic (Claude)</SelectItem><SelectItem value="gemini">Google Gemini</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Model</Label>
                <Select value={s.llmModel} onValueChange={(v) => setS({ ...s, llmModel: v })}><SelectTrigger data-testid="llm-model-select"><SelectValue /></SelectTrigger><SelectContent>{(MODELS[s.llmProvider] || []).map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}{!(MODELS[s.llmProvider] || []).includes(s.llmModel) && <SelectItem value={s.llmModel}>{s.llmModel}</SelectItem>}</SelectContent></Select></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Temperature ({s.temperature})</Label><Input type="number" step="0.1" min="0" max="2" value={s.temperature} onChange={(e) => setS({ ...s, temperature: e.target.value })} data-testid="llm-temperature" /></div>
              <div className="space-y-2"><Label>Max Tokens</Label><Input type="number" min="100" max="4000" value={s.maxTokens} onChange={(e) => setS({ ...s, maxTokens: e.target.value })} data-testid="llm-max-tokens" /></div>
            </div>
            <div className="space-y-2"><Label>Nama Platform</Label><Input value={s.platformName || ''} onChange={(e) => setS({ ...s, platformName: e.target.value })} /></div>
            <Button type="submit" disabled={busy} data-testid="llm-save-btn">{busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Simpan</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4" />Kunci API & Gateway</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex justify-between border-b py-2"><span className="text-muted-foreground">LLM Key</span><span className="font-mono">Emergent Universal Key (sk-emergent-••••)</span></div>
          <div className="flex justify-between border-b py-2"><span className="text-muted-foreground">Payment Gateway</span><span>Tripay — <b>Mode Simulasi</b></span></div>
          <div className="flex justify-between py-2"><span className="text-muted-foreground">Webhook URL</span><span className="font-mono text-xs">/api/webhooks/tripay</span></div>
          <p className="text-xs text-muted-foreground pt-2">Kunci disimpan di environment server dan tidak pernah dikirim ke browser.</p>
        </CardContent>
      </Card>
    </div>
  )
}
