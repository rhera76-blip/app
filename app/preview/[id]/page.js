'use client'

import React, { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/brand'
import { MousePointerClick } from 'lucide-react'

export default function PreviewPage() {
  const { id } = useParams()

  useEffect(() => {
    if (!id) return
    const s = document.createElement('script')
    s.src = `/api/widget.js?v=${Date.now()}`
    s.async = true
    s.setAttribute('data-bot-id', id)
    document.body.appendChild(s)
    return () => {
      s.remove()
      document.querySelectorAll('.bc-btn,.bc-panel').forEach((el) => el.remove())
      window.__babehchatinLoaded = false
    }
  }, [id])

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm py-2 text-center px-4">
        <b>Mode Preview</b> — halaman ini mensimulasikan website klien dengan widget BABEHCHATin terpasang. Klik ikon chat di pojok bawah.
      </div>
      <header className="border-b">
        <div className="container h-16 flex items-center justify-between">
          <div className="font-bold text-xl">Toko<span className="text-primary">Contoh</span>.id</div>
          <nav className="hidden md:flex gap-6 text-sm text-muted-foreground"><span>Beranda</span><span>Produk</span><span>Tentang</span><span>Kontak</span></nav>
          <Badge variant="secondary">Website Klien (Simulasi)</Badge>
        </div>
      </header>
      <main className="container py-16 space-y-16">
        <section className="text-center max-w-2xl mx-auto space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight">Selamat Datang di TokoContoh.id</h1>
          <p className="text-muted-foreground">Ini adalah contoh halaman website pelanggan Anda. Widget chatbot yang telah Anda konfigurasi muncul di pojok halaman dan siap menjawab pertanyaan pengunjung.</p>
          <div className="inline-flex items-center gap-2 text-sm text-primary font-medium mt-4"><MousePointerClick className="h-4 w-4" /> Coba klik tombol chat di pojok bawah</div>
        </section>
        <section className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border p-6 space-y-3">
              <div className="h-36 rounded-xl bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-4/5 rounded bg-muted" />
            </div>
          ))}
        </section>
      </main>
      <footer className="border-t py-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-3">
        <span>Widget disediakan oleh</span><Logo />
      </footer>
    </div>
  )
}
