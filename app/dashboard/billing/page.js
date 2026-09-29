'use client'

import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/app-shell'
import { api, formatIDR, formatDate, formatDateTime, daysLeft } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { PLAN_LIST } from '@/lib/plans'
import { Check, Crown, Loader2, QrCode, CheckCircle2, Clock, Copy, ExternalLink } from 'lucide-react'

export default function BillingPage() {
  const { tenant, refresh } = useAuth()
  const [payments, setPayments] = useState([])
  const [busyPlan, setBusyPlan] = useState(null)
  const [payment, setPayment] = useState(null)
  const [success, setSuccess] = useState(false)

  const loadPayments = () => api('/billing/payments').then(setPayments).catch(() => {})
  useEffect(() => { loadPayments() }, [])

  const checkout = async (planId) => {
    setBusyPlan(planId)
    try {
      const p = await api('/billing/checkout', { method: 'POST', body: { plan: planId, method: 'QRIS' } })
      setPayment(p); setSuccess(false)
      loadPayments()
    } catch (e) { toast.error(e.message) } finally { setBusyPlan(null) }
  }

  const plan = tenant?.planDetails || {}
  const left = daysLeft(tenant?.planExpiresAt)
  const statusBadge = (s) => s === 'PAID' ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">PAID</Badge> : s === 'UNPAID' ? <Badge variant="outline" className="text-amber-700 border-amber-300">UNPAID</Badge> : <Badge variant="outline">{s}</Badge>

  return (
    <div className="space-y-8">
      <PageHeader title="Langganan & Pembayaran" description="Kelola paket langganan dan lihat riwayat pembayaran." />

      <Card className="border-primary/30">
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center gap-6">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><Crown className="h-7 w-7" /></div>
          <div className="flex-1">
            <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Paket saat ini</span><Badge variant={tenant?.expired ? 'destructive' : 'secondary'}>{tenant?.expired ? 'Berakhir' : 'Aktif'}</Badge></div>
            <div className="text-2xl font-bold" data-testid="current-plan-name">{plan.name}</div>
            <div className="text-sm text-muted-foreground">Berlaku hingga <b>{formatDate(tenant?.planExpiresAt)}</b> ({left} hari lagi) • Kuota {plan.messageQuota?.toLocaleString('id-ID')} pesan/bulan • Terpakai {tenant?.messagesUsed || 0}</div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4">Pilih Paket</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLAN_LIST.map((p) => {
            const current = p.id === tenant?.plan
            return (
              <Card key={p.id} className={p.highlight ? 'border-primary shadow-md relative' : ''} data-testid={`plan-card-${p.id}`}>
                {p.highlight && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Populer</Badge>}
                <CardContent className="p-5 space-y-4">
                  <div>
                    <div className="font-semibold flex items-center justify-between">{p.name}{current && <Badge variant="secondary">Saat ini</Badge>}</div>
                    <div className="mt-1"><span className="text-2xl font-extrabold">{p.price === 0 ? 'Gratis' : formatIDR(p.price)}</span>{p.price > 0 && <span className="text-muted-foreground text-xs">/bulan</span>}</div>
                  </div>
                  <ul className="space-y-1.5 text-sm">{p.features.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />{f}</li>)}</ul>
                  {p.id === 'trial' ? (
                    <Button className="w-full" variant="outline" disabled>Paket Percobaan</Button>
                  ) : (
                    <Button className="w-full" variant={p.highlight ? 'default' : 'outline'} onClick={() => checkout(p.id)} disabled={!!busyPlan} data-testid={`choose-plan-${p.id}`}>
                      {busyPlan === p.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <QrCode className="h-4 w-4 mr-2" />}{current ? 'Perpanjang' : 'Bayar via QRIS'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Riwayat Pembayaran</CardTitle><CardDescription>Semua invoice dan status pembayaran.</CardDescription></CardHeader>
        <CardContent>
          {payments.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">Belum ada transaksi.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Paket</TableHead><TableHead>Metode</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Tanggal</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id} data-testid={`payment-row-${p.id}`}>
                    <TableCell className="font-mono text-xs">{p.merchantRef}</TableCell>
                    <TableCell>{p.planName}</TableCell>
                    <TableCell>{p.methodName}</TableCell>
                    <TableCell className="font-medium">{formatIDR(p.total)}</TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(p.createdAt)}</TableCell>
                    <TableCell className="text-right">{p.status === 'UNPAID' && <Button size="sm" variant="outline" onClick={() => { setPayment(p); setSuccess(false) }}>Bayar</Button>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!payment} onOpenChange={(o) => { if (!o) setPayment(null) }}>
        <DialogContent className="sm:max-w-md" data-testid="qris-modal">
          {payment && !success && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><QrCode className="h-5 w-5 text-primary" /> Pembayaran QRIS</DialogTitle>
                <DialogDescription>Scan QR di bawah menggunakan aplikasi m-banking atau e-wallet (GoPay, OVO, Dana, BCA, QRIS All Payment).</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-2">
                <div className="p-3 bg-white rounded-2xl border-2 shadow-sm flex items-center justify-center">
                  {payment.qrString ? (
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payment.qrString)}`} 
                      alt="QRIS Code" 
                      className="w-[220px] h-[220px] rounded-lg"
                    />
                  ) : (
                    <div className="w-[220px] h-[220px] flex items-center justify-center text-muted-foreground text-sm">QR Code tidak tersedia</div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Total Pembayaran</div>
                  <div className="text-3xl font-extrabold" data-testid="qris-amount">{formatIDR(payment.total)}</div>
                  <div className="text-sm mt-1">Paket <b>{payment.planName}</b> • 30 hari</div>
                </div>
                <div className="w-full rounded-lg bg-muted p-3 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Referensi</span><span className="font-mono flex items-center gap-1">{payment.reference}<button onClick={() => { navigator.clipboard?.writeText(payment.reference); toast.success('Disalin') }}><Copy className="h-3 w-3" /></button></span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><span className="font-mono">{payment.merchantRef}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Batas waktu</span><span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDateTime(payment.expiresAt)}</span></div>
                </div>
                {payment.payUrl && (
                  <Button asChild variant="outline" className="w-full">
                    <a href={payment.payUrl} target="_blank" rel="noopener noreferrer">
                      Buka Halaman Checkout TriPay <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                )}
                <p className="text-xs text-muted-foreground text-center">Status pembayaran akan diperbarui secara otomatis setelah pembayaran berhasil diterima.</p>
              </div>
            </>
          )}
          {payment && success && (
            <div className="flex flex-col items-center text-center gap-4 py-6" data-testid="payment-success">
              <div className="h-20 w-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="h-10 w-10" /></div>
              <div>
                <h3 className="text-xl font-bold">Pembayaran Berhasil!</h3>
                <p className="text-sm text-muted-foreground mt-1">Paket <b>{payment.planName}</b> telah aktif. Chatbot Anda siap melayani dengan kuota baru.</p>
              </div>
              <div className="w-full rounded-lg bg-muted p-3 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Referensi</span><span className="font-mono">{payment.reference}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Dibayar</span><span>{formatDateTime(payment.paidAt)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">{formatIDR(payment.total)}</span></div>
              </div>
              <Button className="w-full" onClick={() => { setPayment(null); refresh(); loadPayments(); }}>Selesai</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
