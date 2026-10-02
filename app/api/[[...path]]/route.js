import { NextResponse } from 'next/server'
import { getDb, cleanMany } from '@/lib/db'
import { verifyToken, getBearerToken } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function cors(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}
const json = (data, status = 200) => cors(NextResponse.json(data, { status }))
const fail = (error, status = 400) => json({ error }, status)

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }))
}

export async function GET(request) {
  try {
    const db = await getDb()
    
    // Verifikasi Auth & Pastikan yang akses adalah Master Admin
    const token = getBearerToken(request)
    if (!token) return fail('Unauthorized', 401)
    
    const payload = await verifyToken(token)
    if (!payload?.sub) return fail('Sesi tidak valid', 401)
    
    const user = await db.collection('users').findOne({ id: payload.sub })
    if (!user || user.role !== 'admin') {
      return fail('Hanya Master Admin yang dapat mengakses data ini', 403)
    }

    // Ambil semua data pembayaran dari database terpusat
    const payments = cleanMany(await db.collection('payments').find({}).sort({ createdAt: -1 }).toArray())

    // Hitung ringkasan statistik pendapatan
    let totalRevenue = 0
    let totalSuccess = 0
    let totalPending = 0

    payments.forEach(p => {
      if (p.status === 'PAID') {
        totalRevenue += (p.total || p.amount || 0)
        totalSuccess += 1
      } else if (p.status === 'UNPAID') {
        totalPending += 1
      }
    })

    return json({
      stats: {
        totalRevenue,
        totalSuccess,
        totalPending
      },
      payments
    })
  } catch (e) {
    console.error('Admin Payments API Error:', e)
    return fail('Terjadi kesalahan internal server', 500)
  }
}
