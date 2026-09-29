import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Settings from '@/models/Settings'
import User from '@/models/User'

// Helper untuk mengambil token dari Request Header atau Cookie
function getTokenFromRequest(req) {
  // 1. Cek dari Header Authorization Bearer
  const authHeader = req.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1]
  }

  // 2. Cek dari Cookie Header Request
  const cookieHeader = req.headers.get('cookie') || ''
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]*)/) || cookieHeader.match(/(?:^|;\s*)auth_token=([^;]*)/)
  if (match) {
    return decodeURIComponent(match[1])
  }

  return null
}

// GET: Ambil Settings Platform
export async function GET(req) {
  try {
    await dbConnect()
    let settings = await Settings.findOne()
    if (!settings) {
      settings = await Settings.create({})
    }
    return NextResponse.json(settings)
  } catch (err) {
    console.error('GET Settings Error:', err)
    return NextResponse.json({ error: 'Gagal mengambil data pengaturan' }, { status: 500 })
  }
}

// POST: Simpan / Update Settings Platform
export async function POST(req) {
  try {
    await dbConnect()

    const token = getTokenFromRequest(req)
    if (!token) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan. Silakan login kembali.' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Sesi tidak valid atau telah kadaluarsa.' }, { status: 401 })
    }

    // Cek User dari Database
    const user = await User.findById(decoded.userId)
    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan.' }, { status: 401 })
    }

    // Verifikasi Akses Admin (Super Admin atau Admin)
    const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || decoded.role === 'SUPER_ADMIN' || decoded.role === 'ADMIN'
    
    // Otomatis upgrade akun master jika email cocok
    if (!isAdmin && user.email === 'r.hera76@gmail.com') {
      user.role = 'SUPER_ADMIN'
      await user.save()
    } else if (!isAdmin) {
      return NextResponse.json({ error: 'Akses ditolak. Hanya Master Admin yang diizinkan.' }, { status: 403 })
    }

    const body = await req.json()

    let settings = await Settings.findOne()
    if (!settings) {
      settings = new Settings(body)
    } else {
      Object.assign(settings, body)
    }

    await settings.save()

    return NextResponse.json({ message: 'Pengaturan berhasil disimpan!', settings })
  } catch (err) {
    console.error('POST Settings Error:', err)
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan server' }, { status: 500 })
  }
}
