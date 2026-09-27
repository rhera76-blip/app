'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Logo } from '@/components/brand'
import { useAuth } from '@/lib/auth-context'
import { Loader2, Check } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [form, setForm] = useState({ name: '', businessName: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await register(form)
      toast.success('Akun berhasil dibuat! Trial 14 hari aktif.')
      router.push('/dashboard')
    } catch (err) {
      toast.error(err.message)
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-primary text-primary-foreground p-12">
        <Logo light size="lg" />
        <div className="space-y-6">
          <h2 className="text-4xl font-bold leading-tight">Mulai gratis 14 hari.<br />Chatbot AI pertama Anda siap dalam 5 menit.</h2>
          <ul className="space-y-3 text-primary-foreground/90">
            {['Chatbot default otomatis dibuat', '100 pesan gratis untuk uji coba', 'Knowledge base & domain whitelist', 'Embed code siap pakai'].map((t) => (
              <li key={t} className="flex items-center gap-3"><span className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center"><Check className="h-3.5 w-3.5" /></span>{t}</li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-primary-foreground/70">&copy; {new Date().getFullYear()} BABEHCHATin</p>
      </div>
      <div className="flex items-center justify-center p-4 bg-muted/40">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-center lg:hidden"><Link href="/"><Logo size="lg" /></Link></div>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Daftar Akun Bisnis</CardTitle>
              <CardDescription>Gratis 14 hari, tanpa kartu kredit.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Anda</Label>
                    <Input id="name" data-testid="register-name" placeholder="Budi" value={form.name} onChange={set('name')} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Nama Bisnis</Label>
                    <Input id="businessName" data-testid="register-business" placeholder="Toko Budi" value={form.businessName} onChange={set('businessName')} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" data-testid="register-email" placeholder="nama@bisnis.com" value={form.email} onChange={set('email')} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" data-testid="register-password" placeholder="Minimal 6 karakter" minLength={6} value={form.password} onChange={set('password')} required />
                </div>
                <Button type="submit" className="w-full" disabled={busy} data-testid="register-submit">
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Buat Akun & Mulai Trial
                </Button>
              </form>
              <p className="text-sm text-center text-muted-foreground mt-6">
                Sudah punya akun? <Link href="/login" className="text-primary font-medium hover:underline">Masuk</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
