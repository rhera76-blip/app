'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/brand'
import { PLAN_LIST } from '@/lib/plans'
import { formatIDR } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { Bot, Code2, Globe, BookOpen, Zap, ShieldCheck, Check, ArrowRight, MessageCircle, Sparkles, BarChart3 } from 'lucide-react'

const HERO_IMG = 'https://images.unsplash.com/photo-1762330465857-07e4c81c0dfa?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwzfHxBSSUyMGNoYXRib3R8ZW58MHx8fHwxNzkwNTQ4MjAzfDA&ixlib=rb-4.1.0&q=85'

const FEATURES = [
  { icon: Bot, title: 'Chatbot AI Pintar', desc: 'Ditenagai model AI terbaru (GPT) yang memahami konteks dan menjawab natural dalam Bahasa Indonesia.' },
  { icon: BookOpen, title: 'Knowledge Base', desc: 'Masukkan FAQ, info produk, jam operasional. Chatbot menjawab berdasarkan data bisnis Anda.' },
  { icon: Code2, title: 'Pasang 1 Baris Kode', desc: 'Salin embed code, tempel di website. Tanpa plugin, tanpa dependensi, ringan & cepat.' },
  { icon: Globe, title: 'Domain Whitelist', desc: 'Kontrol penuh domain mana saja yang boleh memuat chatbot Anda. Aman dari penyalahgunaan.' },
  { icon: Zap, title: 'Streaming Real-time', desc: 'Jawaban muncul kata per kata seperti mengetik, pengalaman chat yang terasa hidup.' },
  { icon: BarChart3, title: 'Riwayat & Analitik', desc: 'Pantau semua percakapan pelanggan, jumlah pesan harian, dan pemakaian kuota.' },
]

const STEPS = [
  { n: '01', title: 'Daftar & Buat Chatbot', desc: 'Daftar gratis, langsung dapat chatbot pertama. Atur nama, sambutan, dan persona.' },
  { n: '02', title: 'Isi Knowledge Base', desc: 'Tambahkan info bisnis, FAQ, harga, kebijakan. Chatbot langsung pintar soal bisnis Anda.' },
  { n: '03', title: 'Pasang di Website', desc: 'Salin satu baris script, tempel sebelum </body>. Widget chat tampil di website Anda.' },
]

function Navbar() {
  const { user, loading } = useAuth()
  const dest = user?.role === 'admin' ? '/admin' : '/dashboard'
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/"><Logo /></Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#fitur" className="hover:text-foreground">Fitur</a>
          <a href="#cara-kerja" className="hover:text-foreground">Cara Kerja</a>
          <a href="#harga" className="hover:text-foreground">Harga</a>
        </nav>
        <div className="flex items-center gap-2">
          {!loading && user ? (
            <Button asChild data-testid="nav-dashboard-btn"><Link href={dest}>Dashboard <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          ) : (
            <>
              <Button variant="ghost" asChild data-testid="nav-login-btn"><Link href="/login">Masuk</Link></Button>
              <Button asChild data-testid="nav-register-btn"><Link href="/register">Coba Gratis</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function ChatMock() {
  return (
    <div className="absolute -bottom-6 -left-6 md:-left-12 w-[300px] rounded-2xl bg-white shadow-2xl border overflow-hidden">
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-white/25 flex items-center justify-center font-bold">T</div>
        <div><div className="text-sm font-semibold">Asisten Toko Budi</div><div className="text-[11px] opacity-90 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" />Online</div></div>
      </div>
      <div className="p-3 space-y-2 bg-muted/50 text-sm">
        <div className="bg-white border rounded-xl rounded-bl-sm px-3 py-2 max-w-[85%]">Halo! 👋 Ada yang bisa saya bantu?</div>
        <div className="bg-primary text-primary-foreground rounded-xl rounded-br-sm px-3 py-2 max-w-[85%] ml-auto">Toko buka jam berapa?</div>
        <div className="bg-white border rounded-xl rounded-bl-sm px-3 py-2 max-w-[85%]">Kami buka Senin-Sabtu pukul 09.00-21.00 WIB. Hari Minggu tutup 😊</div>
      </div>
    </div>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,_hsl(var(--primary)/0.12),transparent_50%),radial-gradient(ellipse_at_bottom_right,_hsl(var(--primary)/0.08),transparent_50%)]" />
        <div className="container grid lg:grid-cols-2 gap-12 items-center py-20 lg:py-28">
          <div className="space-y-7">
            <Badge variant="secondary" className="gap-1.5 py-1 px-3"><Sparkles className="h-3.5 w-3.5" /> Platform AI Chatbot SaaS untuk Bisnis Indonesia</Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              Layani Pelanggan <span className="text-primary">24/7</span> dengan AI Chatbot di Website Anda
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              BABEHCHATin membantu UMKM hingga enterprise membuat chatbot AI yang paham bisnis Anda, lalu memasangnya di website hanya dengan satu baris kode. Tanpa coding, tanpa ribet.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" asChild data-testid="hero-cta-register"><Link href="/register">Mulai Gratis 14 Hari <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              <Button size="lg" variant="outline" asChild><a href="#cara-kerja">Lihat Cara Kerja</a></Button>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground pt-2">
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Tanpa kartu kredit</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Setup 5 menit</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Bahasa Indonesia</span>
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="rounded-3xl overflow-hidden shadow-2xl border rotate-1">
              <img src={HERO_IMG} alt="AI Chatbot" className="w-full h-[460px] object-cover" />
            </div>
            <ChatMock />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="fitur" className="py-20 bg-muted/40 border-y">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="outline" className="mb-4">Fitur Unggulan</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Semua yang Anda Butuhkan untuk Chatbot Bisnis</h2>
            <p className="text-muted-foreground mt-4">Dari kustomisasi persona hingga kontrol domain — semuanya dalam satu dashboard yang mudah.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <Card key={f.title} className="border-border/70 hover:shadow-md transition-shadow">
                <CardContent className="p-6 space-y-3">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><f.icon className="h-5 w-5" /></div>
                  <h3 className="font-semibold text-lg">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="cara-kerja" className="py-20">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="outline" className="mb-4">Cara Kerja</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Tiga Langkah, Chatbot Siap Melayani</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.n} className="relative p-6 rounded-2xl border bg-card">
                <div className="text-5xl font-black text-primary/15 absolute top-4 right-5">{s.n}</div>
                <h3 className="font-semibold text-lg mb-2 mt-6">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 max-w-3xl mx-auto rounded-2xl bg-slate-950 text-slate-100 p-6 font-mono text-sm overflow-x-auto shadow-xl">
            <div className="text-slate-500 mb-2">{'<!-- Tempel sebelum </body> di website Anda -->'}</div>
            <div><span className="text-pink-400">&lt;script</span> <span className="text-sky-300">src</span>=<span className="text-emerald-300">"https://babehchatin.com/api/widget.js"</span> <span className="text-sky-300">data-bot-id</span>=<span className="text-emerald-300">"BOT_ID_ANDA"</span> <span className="text-sky-300">async</span><span className="text-pink-400">&gt;&lt;/script&gt;</span></div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="harga" className="py-20 bg-muted/40 border-y">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge variant="outline" className="mb-4">Harga</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Paket Sesuai Skala Bisnis Anda</h2>
            <p className="text-muted-foreground mt-4">Mulai gratis, upgrade kapan saja. Pembayaran mudah via QRIS.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLAN_LIST.map((p) => (
              <Card key={p.id} className={p.highlight ? 'border-primary shadow-lg shadow-primary/10 relative' : ''}>
                {p.highlight && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Paling Populer</Badge>}
                <CardContent className="p-6 space-y-5">
                  <div>
                    <div className="font-semibold text-lg">{p.name}</div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold">{p.price === 0 ? 'Gratis' : formatIDR(p.price)}</span>
                      {p.price > 0 && <span className="text-muted-foreground text-sm">/bulan</span>}
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {p.features.map((f) => <li key={f} className="flex items-start gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />{f}</li>)}
                  </ul>
                  <Button className="w-full" variant={p.highlight ? 'default' : 'outline'} asChild><Link href="/register">{p.price === 0 ? 'Mulai Gratis' : 'Pilih Paket'}</Link></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <div className="rounded-3xl bg-primary text-primary-foreground p-10 md:p-16 text-center relative overflow-hidden">
            <MessageCircle className="absolute -right-10 -bottom-10 h-64 w-64 opacity-10" />
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight relative">Siap Punya Asisten AI untuk Bisnis Anda?</h2>
            <p className="mt-4 text-primary-foreground/85 max-w-xl mx-auto relative">Bergabung dengan bisnis yang sudah melayani pelanggan lebih cepat dengan BABEHCHATin.</p>
            <Button size="lg" variant="secondary" className="mt-8 relative" asChild><Link href="/register">Buat Chatbot Sekarang <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </div>
        </div>
      </section>

      <footer className="border-t py-10">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <Logo />
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> &copy; {new Date().getFullYear()} BABEHCHATin. Platform AI Chatbot SaaS.</div>
        </div>
      </footer>
    </div>
  )
}

export default App
