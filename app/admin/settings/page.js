'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

// Helper untuk mengambil token dari localStorage atau Cookie
function getAuthToken() {
  if (typeof window === 'undefined') return ''
  let token = localStorage.getItem('token') || localStorage.getItem('auth_token') || ''
  if (!token) {
    const match = document.cookie.match(/(?:^|; )token=([^;]*)/)
    if (match) token = decodeURIComponent(match[1])
  }
  return token
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  const [form, setForm] = useState({
    platformName: 'BABEHCHATin',
    logoUrl: '',
    heroTitle: 'Platform AI Chatbot Multi-Tenant Terbaik',
    heroSubtitle: 'Otomatiskan layanan pelanggan dan percakapan bisnis Anda dengan AI',
    primaryColor: '#4f46e5',
    llmProvider: 'openai',
    llmModel: 'gpt-4o-mini',
    temperature: 0.4,
    maxTokens: 800,
    tripayMerchantCode: '',
    tripayApiKey: '',
    tripayPrivateKey: '',
    tripayMode: 'sandbox'
  })

  // 1. Ambil Data Settings dari API
  useEffect(() => {
    async function fetchSettings() {
      try {
        const token = getAuthToken()
        const res = await fetch('/api/admin/settings', {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          }
        })
        const data = await res.json()
        if (res.ok && data) {
          setForm((prev) => ({ ...prev, ...data }))
        }
      } catch (err) {
        console.error('Gagal memuat pengaturan:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  // 2. Simpan Data Settings ke API
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg({ type: '', text: '' })

    try {
      const token = getAuthToken()
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(form)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan pengaturan')

      setMsg({ type: 'success', text: 'Pengaturan berhasil disimpan!' })
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan Platform</h1>
        <p className="text-sm text-gray-500">Kelola tampilan landing page, AI provider, dan konfigurasi Tripay.</p>
      </div>

      {msg.text && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{msg.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Branding & Tampilan */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Branding & Landing Page</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Platform</label>
              <input
                type="text"
                value={form.platformName}
                onChange={(e) => setForm({ ...form, platformName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="BABEHCHATin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL Logo</label>
              <input
                type="text"
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="https://domain.com/logo.png"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hero Title</label>
            <input
              type="text"
              value={form.heroTitle}
              onChange={(e) => setForm({ ...form, heroTitle: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hero Subtitle</label>
            <textarea
              rows={2}
              value={form.heroSubtitle}
              onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Tripay Payment Gateway */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Integrasi Tripay Payment Gateway</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Merchant Code</label>
              <input
                type="text"
                value={form.tripayMerchantCode}
                onChange={(e) => setForm({ ...form, tripayMerchantCode: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="T12345"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
              <select
                value={form.tripayMode}
                onChange={(e) => setForm({ ...form, tripayMode: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="sandbox">Sandbox (Testing)</option>
                <option value="production">Production (Live)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input
              type="password"
              value={form.tripayApiKey}
              onChange={(e) => setForm({ ...form, tripayApiKey: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Private Key</label>
            <input
              type="password"
              value={form.tripayPrivateKey}
              onChange={(e) => setForm({ ...form, tripayPrivateKey: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
        </button>
      </form>
    </div>
  )
}
