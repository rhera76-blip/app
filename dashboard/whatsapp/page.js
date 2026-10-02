'use client'

import { useState, useEffect } from 'react'
import { QrCode, RefreshCw, CheckCircle2, AlertCircle, Smartphone } from 'lucide-react'

export default function WhatsAppPage() {
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Fungsi untuk mengambil data status tenant terbaru
  const fetchTenantData = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/tenant', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setTenant(data)
      }
    } catch (err) {
      console.error('Gagal memuat status tenant:', err)
    }
  }

  useEffect(() => {
    fetchTenantData()
    // Poll status setiap 5 detik agar QR code / status terupdate otomatis
    const interval = setInterval(fetchTenantData, 5000)
    return () => clearInterval(interval)
  }, [])

  // Fungsi untuk memicu koneksi WhatsApp
  const handleConnect = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memulai koneksi WhatsApp')
      }
      // Refresh data setelah beberapa detik
      setTimeout(fetchTenantData, 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">WhatsApp Gateway</h1>
        <p className="text-gray-600 mt-1">Hubungkan nomor WhatsApp bisnis Anda untuk mengaktifkan AI Auto-Reply secara otomatis.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between pb-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-bold text-xl">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">Status Perangkat WhatsApp</h3>
              <p className="text-sm text-gray-500">
                Status saat ini:{' '}
                <span className="font-medium uppercase">
                  {tenant?.whatsappStatus || 'Belum Terhubung'}
                </span>
              </p>
            </div>
          </div>

          <div>
            {tenant?.whatsappStatus === 'connected' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-full">
                <CheckCircle2 className="w-4 h-4" /> Terhubung
              </span>
            ) : (
              <button
                onClick={handleConnect}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                {loading ? 'Menghubungkan...' : 'Hubungkan WhatsApp'}
              </button>
            )}
          </div>
        </div>

        {/* Area Tampil QR Code */}
        {tenant?.whatsappStatus === 'qr_ready' && tenant?.whatsappQr && (
          <div className="mt-8 flex flex-col items-center justify-center text-center p-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <h4 className="font-medium text-gray-900 mb-2">Scan QR Code di bawah ini</h4>
            <p className="text-sm text-gray-500 mb-4">Buka WhatsApp di HP Anda > Menu > Perangkat Tertaut > Tautkan Perangkat</p>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 inline-block">
              {/* Tampilkan teks QR string atau integrasikan dengan library QR code frontend */}
              <div className="p-4 bg-gray-100 text-xs font-mono break-all max-w-xs text-gray-700 rounded">
                {tenant.whatsappQr}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">QR Code akan diperbarui secara otomatis oleh sistem.</p>
          </div>
        )}

        {tenant?.whatsappStatus === 'connected' && (
          <div className="mt-8 p-6 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
            <h4 className="font-semibold text-emerald-900 mb-1">WhatsApp Anda Aktif!</h4>
            <p className="text-sm text-emerald-700">Bot AI BABEHCHATin sekarang siap merespons pesan masuk dari pelanggan secara otomatis.</p>
          </div>
        )}
      </div>
    </div>
  )
}
