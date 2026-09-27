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
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const data = await login(form.email, form.password)
      toast.success(`Selamat datang, ${data.user.name}!`)
      router.push(data.user.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err) {
      toast.error(err.message)
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center"><Link href="/"><Logo size="lg" /></Link></div>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Masuk</CardTitle>
            <CardDescription>Masuk ke dashboard untuk mengelola chatbot Anda.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" data-testid="login-email" placeholder="nama@bisnis.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" data-testid="login-password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <Button type="submit" className="w-full" disabled={busy} data-testid="login-submit">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Masuk
              </Button>
            </form>
            <p className="text-sm text-center text-muted-foreground mt-6">
              Belum punya akun? <Link href="/register" className="text-primary font-medium hover:underline">Daftar gratis</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
