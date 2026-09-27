'use client'

import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader, StatCard } from '@/components/app-shell'
import { api, formatIDR, formatDateTime } from '@/lib/api-client'
import { Wallet, Receipt, Clock } from 'lucide-react'

export default function AdminPayments() {
  const [payments, setPayments] = useState(null)
  useEffect(() => { api('/admin/payments').then(setPayments).catch((e) => toast.error(e.message)) }, [])
  const paid = (payments || []).filter((p) => p.status === 'PAID')
  const revenue = paid.reduce((s, p) => s + (p.total || 0), 0)
  const badge = (s) => <Badge variant={s === 'PAID' ? 'secondary' : 'outline'} className={s === 'PAID' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : s === 'UNPAID' ? 'text-amber-700 border-amber-300' : ''}>{s}</Badge>

  return (
    <div className="space-y-6">
      <PageHeader title="Pembayaran" description="Semua transaksi dari gateway Tripay (mode simulasi)." />
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard title="Total Pendapatan" value={formatIDR(revenue)} icon={Wallet} accent="bg-emerald-100 text-emerald-700" />
        <StatCard title="Transaksi Berhasil" value={paid.length} icon={Receipt} />
        <StatCard title="Menunggu Pembayaran" value={(payments || []).filter((p) => p.status === 'UNPAID').length} icon={Clock} accent="bg-amber-100 text-amber-700" />
      </div>
      <Card><CardContent className="p-0">
        {!payments ? <div className="p-6"><Skeleton className="h-64" /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Referensi</TableHead><TableHead>Tenant</TableHead><TableHead>Paket</TableHead><TableHead>Metode</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Dibuat</TableHead><TableHead>Dibayar</TableHead></TableRow></TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.merchantRef}</TableCell>
                  <TableCell className="font-mono text-xs">{p.reference}</TableCell>
                  <TableCell>{p.tenantName}</TableCell>
                  <TableCell>{p.planName}</TableCell>
                  <TableCell>{p.methodName}</TableCell>
                  <TableCell className="font-medium">{formatIDR(p.total)}</TableCell>
                  <TableCell>{badge(p.status)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(p.createdAt)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(p.paidAt)}</TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-10">Belum ada transaksi.</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  )
}
