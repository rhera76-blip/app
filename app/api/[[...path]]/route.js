import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import dbConnect from '@/lib/db'
import Settings from '@/models/Settings'
import User from '@/models/User'

const JWT_SECRET = process.env.JWT_SECRET || 'babehchatin-secret-key-2026'

// CORS Headers Helper
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: getCorsHeaders() })
}

// Helper Ekstraksi Token
function getTokenFromRequest(req) {
  const authHeader = req.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1]
  }

  const cookieHeader = req.headers.get('cookie') || ''
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]*)/) || cookieHeader.match(/(?:^|;\s*)auth_token=([^;]*)/)
  if (match) {
    return decodeURIComponent(match[1])
  }

  return null
}

// Helper Otentikasi Admin
async function requireAdmin(req) {
  const token = getTokenFromRequest(req)
  if (!token) return { error: 'Sesi tidak ditemukan. Silakan login kembali.', status: 401 }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    await dbConnect()
    const user = await User.findById(decoded.userId)

    if (!user) return { error: 'User tidak ditemukan.', status: 401 }

    // Otomatis pastikan role SUPER_ADMIN untuk master email
    if (user.email === 'r.hera76@gmail.com' && user.role !== 'SUPER_ADMIN') {
      user.role = 'SUPER_ADMIN'
      await user.save()
    }

    const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'
    if (!isAdmin) return { error: 'Akses ditolak. Hanya Master Admin yang diizinkan.', status: 403 }

    return { user }
  } catch (err) {
    return { error: 'Sesi tidak valid atau telah kadaluarsa.', status: 401 }
  }
}

// GET ROUTER
export async function GET(req, { params }) {
  const pathArr = params?.path || []
  const path = pathArr.join('/')

  await dbConnect()

  // Endpoint: GET /api/admin/settings
  if (path === 'admin/settings') {
    try {
      let settings = await Settings.findOne()
      if (!settings) settings = await Settings.create({})
      return NextResponse.json(settings, { headers: getCorsHeaders() })
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500, headers: getCorsHeaders() })
    }
  }

  return NextResponse.json({ status: 'API Route Active', path }, { headers: getCorsHeaders() })
}

// POST ROUTER
export async function POST(req, { params }) {
  const pathArr = params?.path || []
  const path = pathArr.join('/')

  await dbConnect()

  // Endpoint: POST /api/admin/settings
  if (path === 'admin/settings') {
    const auth = await requireAdmin(req)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status, headers: getCorsHeaders() })
    }

    try {
      const body = await req.json()
      let settings = await Settings.findOne()

      if (!settings) {
        settings = new Settings(body)
      } else {
        Object.assign(settings, body)
      }

      await settings.save()
      return NextResponse.json({ message: 'Pengaturan berhasil disimpan!', settings }, { headers: getCorsHeaders() })
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500, headers: getCorsHeaders() })
    }
  }

  return NextResponse.json({ error: 'Endpoint tidak ditemukan' }, { status: 404, headers: getCorsHeaders() })
}
