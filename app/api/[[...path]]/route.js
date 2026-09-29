import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { LlmChat, UserMessage } from 'emergentintegrations'
import { getDb, clean, cleanMany } from '@/lib/db'
import { hashPassword, verifyPassword, signToken, verifyToken, getBearerToken, publicUser } from '@/lib/auth'
import { PLANS, PLAN_LIST, getPlan } from '@/lib/plans'
import { buildWidgetScript } from '@/lib/widget-script'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ---------- helpers ----------
function cors(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Callback-Signature, X-Callback-Event')
  return response
}
const json = (data, status = 200) => cors(NextResponse.json(data, { status }))
const fail = (error, status = 400) => json({ error }, status)

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

async function readJson(request) {
  try { return await request.json() } catch { return {} }
}

function hostOf(value) {
  if (!value) return ''
  try { return new URL(value.includes('://') ? value : `https://${value}`).hostname.toLowerCase() } catch { return String(value).toLowerCase() }
}

function domainAllowed(allowedDomains = [], origin) {
  const host = hostOf(origin)
  if (!host) return allowedDomains.length === 0
  const platformHost = hostOf(process.env.NEXT_PUBLIC_BASE_URL)
  if (host === platformHost || host === 'localhost' || host === '127.0.0.1') return true
  if (!allowedDomains.length) return true
  return allowedDomains.some((d) => {
    const dom = hostOf(d.trim())
    if (!dom) return false
    if (dom.startsWith('*.')) { const base = dom.slice(2); return host === base || host.endsWith('.' + base) }
    return host === dom || host === 'www.' + dom || 'www.' + host === dom
  })
}

const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

async function getTenantWithUsage(db, tenantId) {
  const tenant = await db.collection('tenants').findOne({ id: tenantId })
  if (!tenant) return null
  const mk = monthKey()
  if (tenant.usageMonth !== mk) {
    await db.collection('tenants').updateOne({ id: tenantId }, { $set: { usageMonth: mk, messagesUsed: 0 } })
    tenant.usageMonth = mk; tenant.messagesUsed = 0
  }
  const plan = getPlan(tenant.plan)
  const expired = tenant.planExpiresAt ? new Date(tenant.planExpiresAt) < new Date() : false
  return { ...clean(tenant), planDetails: plan, expired, quotaRemaining: Math.max(0, plan.messageQuota - (tenant.messagesUsed || 0)) }
}

// ---------- auth ----------
async function requireAuth(request, db) {
  const token = getBearerToken(request)
  if (!token) throw new HttpError(401, 'Unauthorized')
  const payload = await verifyToken(token)
  if (!payload?.sub) throw new HttpError(401, 'Sesi tidak valid, silakan login kembali')
  const user = await db.collection('users').findOne({ id: payload.sub })
  if (!user) throw new HttpError(401, 'User tidak ditemukan')
  if (user.status === 'suspended') throw new HttpError(403, 'Akun Anda ditangguhkan')
  return user
}

async function requireAdmin(request, db) {
  const user = await requireAuth(request, db)
  if (user.email === 'r.hera76@gmail.com' && user.role !== 'admin') {
    await db.collection('users').updateOne({ id: user.id }, { $set: { role: 'admin' } })
    user.role = 'admin'
  }
  if (user.role !== 'admin') throw new HttpError(403, 'Hanya Master Admin yang dapat mengakses')
  return user
}

// ---------- seed ----------
let seeded = false
async function ensureSeed(db) {
  if (seeded) return
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@babehchatin.com'
  const existing = await db.collection('users').findOne({ role: 'admin' })
  if (!existing) {
    await db.collection('users').insertOne({
      id: uuidv4(), name: 'Master Admin', email: adminEmail,
      passwordHash: await hashPassword(process.env.ADMIN_PASSWORD || 'Admin123!'),
      role: 'admin', tenantId: null, status: 'active', createdAt: new Date().toISOString(),
    })
  }
  const settings = await db.collection('settings').findOne({ key: 'platform' })
  if (!settings) {
    await db.collection('settings').insertOne({
      key: 'platform',
      llmProvider: 'openai',
      llmModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.4,
      maxTokens: 800,
      platformName: 'BABEHCHATin',
      logoUrl: '',
      heroTitle: 'Layani Pelanggan 24/7 dengan AI Chatbot di Website Anda',
      heroSubtitle: 'BABEHCHATin membantu bisnis Anda merespons pelanggan secara otomatis dan instan.',
      primaryColor: '#4f46e5',
      updatedAt: new Date().toISOString(),
    })
  }
  await Promise.all([
    db.collection('users').createIndex({ email: 1 }, { unique: true }).catch(() => {}),
    db.collection('chat_messages').createIndex({ sessionId: 1, createdAt: 1 }).catch(() => {}),
    db.collection('chat_messages').createIndex({ tenantId: 1, createdAt: -1 }).catch(() => {}),
    db.collection('chat_sessions').createIndex({ chatbotId: 1, lastMessageAt: -1 }).catch(() => {}),
  ])
  seeded = true
}

async function getSettings(db) {
  const settings = await db.collection('settings').findOne({ key: 'platform' })
  return clean(settings) || {
    llmProvider: 'openai',
    llmModel: 'gpt-4o-mini',
    temperature: 0.4,
    maxTokens: 800,
    platformName: 'BABEHCHATin',
    logoUrl: '',
    heroTitle: 'Layani Pelanggan 24/7 dengan AI Chatbot di Website Anda',
    heroSubtitle: 'BABEHCHATin membantu bisnis Anda merespons pelanggan secara otomatis.',
    primaryColor: '#4f46e5',
  }
}

// ---------- billing (TriPay Live/Sandbox Integration) ----------
async function processPaidPayment(db, payment) {
  if (payment.status === 'PAID') return payment
  const plan = getPlan(payment.plan)
  const tenant = await db.collection('tenants').findOne({ id: payment.tenantId })
  const now = new Date()
  let base = now
  if (tenant && tenant.plan === plan.id && tenant.planExpiresAt && new Date(tenant.planExpiresAt) > now) base = new Date(tenant.planExpiresAt)
  const expires = new Date(base.getTime() + plan.durationDays * 86400000)
  await db.collection('tenants').updateOne({ id: payment.tenantId }, {
    $set: { plan: plan.id, planStartedAt: now.toISOString(), planExpiresAt: expires.toISOString(), status: 'active', updatedAt: now.toISOString() },
  })
  const paidAt = now.toISOString()
  await db.collection('payments').updateOne({ id: payment.id }, { $set: { status: 'PAID', paidAt } })
  return { ...payment, status: 'PAID', paidAt }
}

// ---------- LLM ----------
function buildSystemPrompt(chatbot) {
  let prompt = chatbot.systemPrompt?.trim() || `Kamu adalah ${chatbot.name}, asisten virtual yang ramah dan membantu.`
  prompt += `\n\nAturan: Jawab dengan ringkas, jelas, dan sopan. Gunakan bahasa yang sama dengan bahasa pengguna (default Bahasa Indonesia). Jika jawaban tidak ada di knowledge base, katakan dengan jujur bahwa kamu tidak memiliki informasinya dan sarankan menghubungi tim.`
  const kb = (chatbot.knowledgeBase || []).filter((k) => k?.content?.trim())
  if (kb.length) {
    let kbText = kb.map((k) => `### ${k.title || 'Info'}\n${k.content.trim()}`).join('\n\n')
    if (kbText.length > 24000) kbText = kbText.slice(0, 24000) + '\n...(dipotong)'
    prompt += `\n\n=== KNOWLEDGE BASE ===\n${kbText}\n=== AKHIR KNOWLEDGE BASE ===\nGunakan knowledge base di atas sebagai sumber utama jawaban.`
  }
  return prompt
}

function sse(type, value) { return `event: ${type}\ndata: ${JSON.stringify(value)}\n\n` }

async function handlePublicChat(request, db) {
  const body = await readJson(request)
  const { botId, message } = body
  let { sessionId } = body
  if (!botId || !message || typeof message !== 'string') return fail('botId dan message wajib diisi')
  if (message.length > 4000) return fail('Pesan terlalu panjang (maks 4000 karakter)')

  const chatbot = await db.collection('chatbots').findOne({ id: botId })
  if (!chatbot) return fail('Chatbot tidak ditemukan', 404)
  if (chatbot.isActive === false) return fail('Chatbot sedang nonaktif', 403)

  const origin = request.headers.get('origin') || body.origin || request.headers.get('referer') || ''
  if (!domainAllowed(chatbot.allowedDomains || [], origin)) return fail('Domain tidak diizinkan untuk chatbot ini', 403)

  const tenant = await getTenantWithUsage(db, chatbot.tenantId)
  if (!tenant) return fail('Tenant tidak ditemukan', 404)
  if (tenant.status === 'suspended') return fail('Layanan ditangguhkan', 403)
  if (tenant.expired) return fail('Langganan telah berakhir. Silakan perbarui paket.', 402)
  if (tenant.quotaRemaining <= 0) return fail('Kuota pesan bulan ini telah habis', 429)

  const now = new Date().toISOString()
  let session = sessionId ? await db.collection('chat_sessions').findOne({ id: sessionId, chatbotId: botId }) : null
  if (!session) {
    session = { id: uuidv4(), chatbotId: botId, tenantId: chatbot.tenantId, origin: hostOf(origin) || 'unknown', pageUrl: body.pageUrl || '', messageCount: 0, createdAt: now, lastMessageAt: now }
    await db.collection('chat_sessions').insertOne(session)
  }
  sessionId = session.id

  const history = await db.collection('chat_messages').find({ sessionId }).sort({ createdAt: 1 }).limit(20).toArray()
  const initial = [{ role: 'system', content: buildSystemPrompt(chatbot) }, ...history.map((m) => ({ role: m.role, content: m.content }))]

  await db.collection('chat_messages').insertOne({ id: uuidv4(), sessionId, chatbotId: botId, tenantId: chatbot.tenantId, role: 'user', content: message, createdAt: now })

  const settings = await getSettings(db)
  const key = process.env.EMERGENT_LLM_KEY
  if (!key?.startsWith('sk-emergent-')) return fail('Konfigurasi LLM belum tersedia', 500)

  const chat = new LlmChat(key, sessionId, initial[0].content, initial)
    .withModel(settings.llmProvider || 'openai', settings.llmModel || 'gpt-4o-mini')
    .withParams({ temperature: Number(settings.temperature ?? 0.4), max_tokens: Number(settings.maxTokens ?? 800) })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let full = ''
      controller.enqueue(encoder.encode(sse('meta', { sessionId })))
      try {
        for await (const ev of chat.streamMessage(new UserMessage({ text: message }))) {
          if (ev.type === 'text_delta' && ev.content) { full += ev.content; controller.enqueue(encoder.encode(sse('delta', ev.content))) }
        }
        controller.enqueue(encoder.encode(sse('done', { content: full, sessionId })))
      } catch (e) {
        console.error('LLM stream error:', e.message)
        controller.enqueue(encoder.encode(sse('error', { message: 'Maaf, terjadi gangguan. Coba lagi sebentar.' })))
      }
      try {
        const doneAt = new Date().toISOString()
        if (full) await db.collection('chat_messages').insertOne({ id: uuidv4(), sessionId, chatbotId: botId, tenantId: chatbot.tenantId, role: 'assistant', content: full, createdAt: doneAt })
        await db.collection('chat_sessions').updateOne({ id: sessionId }, { $set: { lastMessageAt: doneAt, lastMessage: message.slice(0, 120) },$inc: { messageCount: 1 } })
        await db.collection('tenants').updateOne({ id: chatbot.tenantId }, { $inc: { messagesUsed: 1 } })
        await db.collection('chatbots').updateOne({ id: botId }, { $inc: { totalMessages: 1 } })
      } catch (e) { console.error('persist error', e.message) }
      controller.close()
    },
  })
  return cors(new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' } }))
}

function sanitizeChatbotInput(body, existing = {}) {
  const out = {}
  if (body.name !== undefined) out.name = String(body.name).trim().slice(0, 60) || existing.name || 'Asisten'
  if (body.avatarUrl !== undefined) out.avatarUrl = String(body.avatarUrl || '').trim().slice(0, 500)
  if (body.systemPrompt !== undefined) out.systemPrompt = String(body.systemPrompt || '').slice(0, 8000)
  if (body.welcomeMessage !== undefined) out.welcomeMessage = String(body.welcomeMessage || '').slice(0, 500)
  if (body.placeholder !== undefined) out.placeholder = String(body.placeholder || '').slice(0, 80)
  if (body.primaryColor !== undefined) out.primaryColor = /^#[0-9a-fA-F]{6}$/.test(body.primaryColor) ? body.primaryColor : (existing.primaryColor || '#4f46e5')
  if (body.position !== undefined) out.position = body.position === 'bottom-left' ? 'bottom-left' : 'bottom-right'
  if (body.isActive !== undefined) out.isActive = Boolean(body.isActive)
  if (body.allowedDomains !== undefined) {
    const arr = Array.isArray(body.allowedDomains) ? body.allowedDomains : String(body.allowedDomains).split(/[\n,]/)
    out.allowedDomains = [...new Set(arr.map((d) => String(d).trim().toLowerCase()).filter(Boolean).map((d) => hostOf(d)))].slice(0, 50)
  }
  if (body.knowledgeBase !== undefined) {
    const arr = Array.isArray(body.knowledgeBase) ? body.knowledgeBase : []
    out.knowledgeBase = arr.slice(0, 100).map((k) => ({ id: k.id || uuidv4(), title: String(k.title || '').slice(0, 120), content: String(k.content || '').slice(0, 20000), updatedAt: new Date().toISOString() }))
  }
  return out
}

export async function GET(request, context) {
  return handleRoute(request, context)
}

export async function POST(request, context) {
  return handleRoute(request, context)
}

export async function PUT(request, context) {
  return handleRoute(request, context)
}

export async function DELETE(request, context) {
  return handleRoute(request, context)
}

export async function PATCH(request, context) {
  return handleRoute(request, context)
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }))
}

async function handleRoute(request, { params }) {
  const resolvedParams = await params
  const path = resolvedParams?.path || []
  const route = `/${path.join('/')}`
  const method = request.method
  const url = new URL(request.url)

  try {
    const db = await getDb()
    await ensureSeed(db)

    if ((route === '/' || route === '/root' || route === '/health') && method === 'GET') return json({ status: 'ok', app: 'BABEHCHATin API' })

    if (route === '/settings/public' && method === 'GET') {
      const settings = await getSettings(db)
      return json({
        platformName: settings.platformName || 'BABEHCHATin',
        logoUrl: settings.logoUrl || '',
        heroTitle: settings.heroTitle || 'Layani Pelanggan 24/7 dengan AI Chatbot di Website Anda',
        heroSubtitle: settings.heroSubtitle || 'BABEHCHATin membantu bisnis Anda merespons pelanggan secara otomatis.',
        primaryColor: settings.primaryColor || '#4f46e5',
      })
    }

    if (route === '/widget.js' && method === 'GET') {
      const base = process.env.NEXT_PUBLIC_BASE_URL || `${url.protocol}//${url.host}`
      return cors(new Response(buildWidgetScript(base), { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=300' } }))
    }

    if (path[0] === 'v1' && path[1] === 'bot' && path[2] && path[3] === 'config' && method === 'GET') {
      const chatbot = await db.collection('chatbots').findOne({ id: path[2] })
      if (!chatbot) return fail('Chatbot tidak ditemukan', 404)
      if (chatbot.isActive === false) return fail('Chatbot sedang nonaktif', 403)
      const origin = request.headers.get('origin') || url.searchParams.get('origin') || request.headers.get('referer') || ''
      if (!domainAllowed(chatbot.allowedDomains || [], origin)) return fail('Domain tidak diizinkan untuk chatbot ini', 403)
      const tenant = await getTenantWithUsage(db, chatbot.tenantId)
      if (!tenant || tenant.status === 'suspended') return fail('Layanan tidak tersedia', 403)
      if (tenant.expired) return fail('Langganan telah berakhir', 402)
      return json({ id: chatbot.id, name: chatbot.name, avatarUrl: chatbot.avatarUrl || '', welcomeMessage: chatbot.welcomeMessage || '', placeholder: chatbot.placeholder || 'Tulis pesan...', primaryColor: chatbot.primaryColor || '#4f46e5', position: chatbot.position || 'bottom-right' })
    }
    if (route === '/v1/chat' && method === 'POST') return handlePublicChat(request, db)

    if (route === '/plans' && method === 'GET') return json(PLAN_LIST)

    if (route === '/auth/register' && method === 'POST') {
      const body = await readJson(request)
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      const name = String(body.name || '').trim()
      const businessName = String(body.businessName || '').trim()
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('Email tidak valid')
      if (password.length < 6) return fail('Password minimal 6 karakter')
      if (!name) return fail('Nama wajib diisi')
      if (!businessName) return fail('Nama bisnis wajib diisi')
      if (await db.collection('users').findOne({ email })) return fail('Email sudah terdaftar', 409)
      const now = new Date()
      const tenant = {
        id: uuidv4(), name: businessName, ownerUserId: null, plan: 'trial', planStartedAt: now.toISOString(),
        planExpiresAt: new Date(now.getTime() + PLANS.trial.durationDays * 86400000).toISOString(),
        messagesUsed: 0, usageMonth: monthKey(now), status: 'active', createdAt: now.toISOString(),
      }
      const user = { id: uuidv4(), name, email, passwordHash: await hashPassword(password), role: 'tenant', tenantId: tenant.id, status: 'active', createdAt: now.toISOString() }
      tenant.ownerUserId = user.id
      await db.collection('tenants').insertOne(tenant)
      await db.collection('users').insertOne(user)
      await db.collection('chatbots').insertOne({
        id: uuidv4(), tenantId: tenant.id, name: `Asisten ${businessName}`, avatarUrl: '',
        systemPrompt: `Kamu adalah asisten virtual untuk ${businessName}. Bantu pelanggan dengan ramah dan profesional.`,
        welcomeMessage: `Halo! 👋 Selamat datang di ${businessName}. Ada yang bisa saya bantu?`, placeholder: 'Tulis pesan...',
        primaryColor: '#4f46e5', position: 'bottom-right', allowedDomains: [], knowledgeBase: [], isActive: true, totalMessages: 0, createdAt: now.toISOString(), updatedAt: now.toISOString(),
      })
      const token = await signToken({ sub: user.id, role: user.role, tenantId: tenant.id })
      return json({ token, user: publicUser(user), tenant: await getTenantWithUsage(db, tenant.id) }, 201)
    }

    if (route === '/auth/login' && method === 'POST') {
      const body = await readJson(request)
      const email = String(body.email || '').trim().toLowerCase()
      const user = await db.collection('users').findOne({ email })
      if (!user || !(await verifyPassword(String(body.password || ''), user.passwordHash))) return fail('Email atau password salah', 401)
      if (user.status === 'suspended') return fail('Akun Anda ditangguhkan', 403)
      const token = await signToken({ sub: user.id, role: user.role, tenantId: user.tenantId })
      const tenant = user.tenantId ? await getTenantWithUsage(db, user.tenantId) : null
      return json({ token, user: publicUser(user), tenant })
    }

    if (route === '/auth/me' && method === 'GET') {
      const user = await requireAuth(request, db)
      const tenant = user.tenantId ? await getTenantWithUsage(db, user.tenantId) : null
      return json({ user: publicUser(user), tenant })
    }

    if (route === '/tenant' && method === 'GET') {
      const user = await requireAuth(request, db)
      return json(await getTenantWithUsage(db, user.tenantId))
    }
    if (route === '/tenant' && method === 'PUT') {
      const user = await requireAuth(request, db)
      const body = await readJson(request)
      const $set = { updatedAt: new Date().toISOString() }
      if (body.name) $set.name = String(body.name).trim().slice(0, 80)
      await db.collection('tenants').updateOne({ id: user.tenantId }, { $set })
      if (body.userName) await db.collection('users').updateOne({ id: user.id }, { $set: { name: String(body.userName).trim().slice(0, 80) } })
      return json(await getTenantWithUsage(db, user.tenantId))
    }
    if (route === '/tenant/stats' && method === 'GET') {
      const user = await requireAuth(request, db)
      const tenant = await getTenantWithUsage(db, user.tenantId)
      const chatbots = cleanMany(await db.collection('chatbots').find({ tenantId: user.tenantId }).toArray())
      const since = new Date(Date.now() - 6 * 86400000); since.setHours(0, 0, 0, 0)
      const msgs = await db.collection('chat_messages').find({ tenantId: user.tenantId, role: 'user', createdAt: { $gte: since.toISOString() } }).project({ createdAt: 1, chatbotId: 1 }).toArray()
      const daily = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); const k = d.toISOString().slice(0, 10)
        daily.push({ date: k, label: d.toLocaleDateString('id-ID', { weekday: 'short' }), count: msgs.filter((m) => m.createdAt.slice(0, 10) === k).length })
      }
      const totalSessions = await db.collection('chat_sessions').countDocuments({ tenantId: user.tenantId })
      const totalMessages = await db.collection('chat_messages').countDocuments({ tenantId: user.tenantId, role: 'user' })
      const recentSessions = cleanMany(await db.collection('chat_sessions').find({ tenantId: user.tenantId }).sort({ lastMessageAt: -1 }).limit(5).toArray())
      return json({ tenant, chatbots, daily, totalSessions, totalMessages, recentSessions })
    }

    if (route === '/chatbots' && method === 'GET') {
      const user = await requireAuth(request, db)
      return json(cleanMany(await db.collection('chatbots').find({ tenantId: user.tenantId }).sort({ createdAt: 1 }).toArray()))
    }
    if (route === '/chatbots' && method === 'POST') {
      const user = await requireAuth(request, db)
      const tenant = await getTenantWithUsage(db, user.tenantId)
      const count = await db.collection('chatbots').countDocuments({ tenantId: user.tenantId })
      if (count >= tenant.planDetails.maxChatbots) return fail(`Paket ${tenant.planDetails.name} hanya mengizinkan ${tenant.planDetails.maxChatbots} chatbot. Upgrade paket untuk menambah.`, 403)
      const body = await readJson(request)
      const now = new Date().toISOString()
      const bot = {
        id: uuidv4(), tenantId: user.tenantId, name: 'Chatbot Baru', avatarUrl: '', systemPrompt: '', welcomeMessage: 'Halo! Ada yang bisa saya bantu?', placeholder: 'Tulis pesan...',
        primaryColor: '#4f46e5', position: 'bottom-right', allowedDomains: [], knowledgeBase: [], isActive: true, totalMessages: 0, createdAt: now, updatedAt: now,
        ...sanitizeChatbotInput(body),
      }
      await db.collection('chatbots').insertOne(bot)
      return json(clean(bot), 201)
    }
    if (path[0] === 'chatbots' && path[1] && path.length === 2) {
      const user = await requireAuth(request, db)
      const bot = await db.collection('chatbots').findOne({ id: path[1], tenantId: user.tenantId })
      if (!bot) return fail('Chatbot tidak ditemukan', 404)
      if (method === 'GET') return json(clean(bot))
      if (method === 'PUT' || method === 'PATCH') {
        const body = await readJson(request)
        const $set = { ...sanitizeChatbotInput(body, bot), updatedAt: new Date().toISOString() }
        await db.collection('chatbots').updateOne({ id: bot.id }, { $set })
        return json(clean(await db.collection('chatbots').findOne({ id: bot.id })))
      }
      if (method === 'DELETE') {
        await db.collection('chatbots').deleteOne({ id: bot.id })
        return json({ success: true })
      }
    }
    if (path[0] === 'chatbots' && path[1] && path[2] === 'conversations' && method === 'GET') {
      const user = await requireAuth(request, db)
      const bot = await db.collection('chatbots').findOne({ id: path[1], tenantId: user.tenantId })
      if (!bot) return fail('Chatbot tidak ditemukan', 404)
      if (path[3]) {
        const session = await db.collection('chat_sessions').findOne({ id: path[3], chatbotId: bot.id })
        if (!session) return fail('Percakapan tidak ditemukan', 404)
        const messages = cleanMany(await db.collection('chat_messages').find({ sessionId: session.id }).sort({ createdAt: 1 }).toArray())
        return json({ session: clean(session), messages })
      }
      const sessions = cleanMany(await db.collection('chat_sessions').find({ chatbotId: bot.id }).sort({ lastMessageAt: -1 }).limit(100).toArray())
      return json(sessions)
    }

    // ===== Billing (Tripay Integration) =====
    if (route === '/billing/checkout' && method === 'POST') {
      const user = await requireAuth(request, db)
      const body = await readJson(request)
      const plan = PLANS[body.plan]
      if (!plan || plan.id === 'trial') return fail('Paket tidak valid')

      const apiKey = process.env.TRIPAY_API_KEY
      const privateKey = process.env.TRIPAY_PRIVATE_KEY
      const merchantCode = process.env.TRIPAY_MERCHANT_CODE

      if (!apiKey || !privateKey || !merchantCode) {
        return fail('Konfigurasi pembayaran TriPay belum lengkap di environment variable Vercel.', 500)
      }

      const now = new Date()
      const merchantRef = 'INV-' + now.getTime()
      const amount = plan.price
      const method_ = body.method === 'BANK_TRANSFER' ? 'BR' : 'QRIS'

      const signature = crypto
        .createHmac('sha256', privateKey)
        .update(merchantCode + merchantRef + amount)
        .digest('hex')

      const tripayPayload = {
        method: method_,
        merchant_ref: merchantRef,
        amount: amount,
        customer_name: user.name,
        customer_email: user.email,
        order_items: [
          {
            sku: plan.id,
            name: `Langganan Paket ${plan.name} BABEHCHATin`,
            price: plan.price,
            quantity: 1,
          }
        ],
        expired_time: Math.floor(Date.now() / 1000) + (24 * 3600),
        signature: signature
      }

      const tripayUrl = 'https://tripay.co.id/api-sandbox/merchant/closed-transaction/create'

      const tripayRes = await fetch(tripayUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tripayPayload)
      })

      const textRes = await tripayRes.text()
      let tripayData
      try {
        tripayData = JSON.parse(textRes)
      } catch {
        return fail(`Gagal mengurai respons dari TriPay: ${textRes.slice(0, 100)}`, 500)
      }

      if (!tripayData.success) {
        return fail(`Gagal membuat transaksi TriPay: ${tripayData.message || 'Unknown error'}`, 400)
      }

      const resData = tripayData.data
      const payment = {
        id: uuidv4(),
        tenantId: user.tenantId,
        userId: user.id,
        plan: plan.id,
        planName: plan.name,
        amount: amount,
        fee: resData.total_fee || 0,
        total: resData.amount || amount,
        method: body.method || 'QRIS',
        methodName: resData.payment_name || method_,
        reference: resData.reference,
        merchantRef: merchantRef,
        status: 'UNPAID',
        gateway: 'tripay',
        qrString: resData.qr_string || null,
        payUrl: resData.checkout_url || '',
        expiresAt: new Date(resData.expired_time * 1000).toISOString(),
        createdAt: now.toISOString(),
        paidAt: null,
      }

      await db.collection('payments').insertOne(payment)
      return json(clean(payment), 201)
    }

    if (route === '/billing/payments' && method === 'GET') {
      const user = await requireAuth(request, db)
      return json(cleanMany(await db.collection('payments').find({ tenantId: user.tenantId }).sort({ createdAt: -1 }).limit(50).toArray()))
    }

    if (path[0] === 'billing' && path[1] === 'payments' && path[2]) {
      const user = await requireAuth(request, db)
      const payment = await db.collection('payments').findOne({ id: path[2], tenantId: user.tenantId })
      if (!payment) return fail('Pembayaran tidak ditemukan', 404)
      if (method === 'GET' && !path[3]) return json(clean(payment))
      
      if (path[3] === 'simulate' && method === 'POST') {
        return fail('Simulasi manual dinonaktifkan karena menggunakan TriPay Live/Sandbox asli.', 400)
      }
    }

    // TriPay Webhook Handler
    if (route === '/webhooks/tripay' && method === 'POST') {
      const privateKey = process.env.TRIPAY_PRIVATE_KEY
      const callbackSignature = request.headers.get('x-callback-signature') || ''
      
      const rawBody = await request.text()
      const localSignature = crypto
        .createHmac('sha256', privateKey || '')
        .update(rawBody)
        .digest('hex')

      if (callbackSignature !== localSignature) {
        return fail('Invalid signature', 403)
      }

      const body = JSON.parse(rawBody)
      const reference = body.reference
      const status = String(body.status || '').toUpperCase()

      if (!reference) return fail('reference wajib diisi')
      const payment = await db.collection('payments').findOne({ reference })
      if (!payment) return fail('Pembayaran tidak ditemukan', 404)

      if (status === 'PAID') {
        await processPaidPayment(db, clean(payment))
        return json({ success: true, status: 'PAID' })
      }
      if (['EXPIRED', 'FAILED', 'REFUND'].includes(status)) {
        await db.collection('payments').updateOne({ id: payment.id }, { $set: { status } })
        return json({ success: true, status })
      }
      return json({ success: true, status: payment.status })
    }

    // ===== Admin =====
    if (path[0] === 'admin') {
      await requireAdmin(request, db)

      if (route === '/admin/settings' && method === 'GET') {
        return json(await getSettings(db))
      }
      if (route === '/admin/settings' && (method === 'PUT' || method === 'POST')) {
        const body = await readJson(request)
        const $set = { updatedAt: new Date().toISOString() }
        if (body.llmProvider) $set.llmProvider = body.llmProvider
        if (body.llmModel) $set.llmModel = body.llmModel
        if (body.temperature !== undefined) $set.temperature = Number(body.temperature)
        if (body.maxTokens !== undefined) $set.maxTokens = Number(body.maxTokens)
        if (body.platformName !== undefined) $set.platformName = String(body.platformName).trim()
        if (body.logoUrl !== undefined) $set.logoUrl = String(body.logoUrl).trim()
        if (body.heroTitle !== undefined) $set.heroTitle = String(body.heroTitle).trim()
        if (body.heroSubtitle !== undefined) $set.heroSubtitle = String(body.heroSubtitle).trim()
        if (body.primaryColor !== undefined) $set.primaryColor = body.primaryColor

        await db.collection('settings').updateOne({ key: 'platform' }, { $set }, { upsert: true })
        return json(await getSettings(db))
      }

      if (route === '/admin/overview' && method === 'GET') {
        const [totalTenants, totalChatbots, totalSessions, totalMessages] = await Promise.all([
          db.collection('tenants').countDocuments({}), db.collection('chatbots').countDocuments({}),
          db.collection('chat_sessions').countDocuments({}), db.collection('chat_messages').countDocuments({ role: 'user' }),
        ])
        const nowIso = new Date().toISOString()
        const activePaid = await db.collection('tenants').countDocuments({ plan: { $ne: 'trial' }, planExpiresAt: {$gt: nowIso }, status: 'active' })
        const paid = await db.collection('payments').find({ status: 'PAID' }).toArray()
        const revenue = paid.reduce((s, p) => s + (p.total || 0), 0)
        const mk = monthKey()
        const revenueThisMonth = paid.filter((p) => (p.paidAt || '').startsWith(mk)).reduce((s, p) => s + (p.total || 0), 0)
        const byPlan = {}
        for (const p of PLAN_LIST) byPlan[p.id] = await db.collection('tenants').countDocuments({ plan: p.id })
        return json({ totalTenants, totalChatbots, totalSessions, totalMessages, activePaid, revenue, revenueThisMonth, byPlan })
      }

      if (route === '/admin/tenants' && method === 'GET') {
        const tenants = cleanMany(await db.collection('tenants').find({}).sort({ createdAt: -1 }).toArray())
        const users = cleanMany(await db.collection('users').find({}).toArray())
        const list = tenants.map((t) => ({ ...t, owner: users.find((u) => u.tenantId === t.id) || null, planDetails: getPlan(t.plan) }))
        return json(list)
      }
      if (path[0] === 'admin' && path[1] === 'tenants' && path[2]) {
        const tenantId = path[2]
        const tenant = await db.collection('tenants').findOne({ id: tenantId })
        if (!tenant) return fail('Tenant tidak ditemukan', 404)
        if (method === 'DELETE') {
          await Promise.all([
            db.collection('tenants').deleteOne({ id: tenantId }),
            db.collection('chatbots').deleteMany({ tenantId }),
            db.collection('chat_sessions').deleteMany({ tenantId }),
            db.collection('chat_messages').deleteMany({ tenantId }),
            db.collection('payments').deleteMany({ tenantId }),
            db.collection('users').deleteMany({ tenantId }),
          ])
          return json({ success: true })
        }
        if (method === 'PATCH' || method === 'PUT') {
          const body = await readJson(request)
          const $set = { updatedAt: new Date().toISOString() }
          if (body.status) $set.status = body.status
          if (body.plan) {
            $set.plan = body.plan
            const p = getPlan(body.plan)
            const now = new Date()
            $set.planStartedAt = now.toISOString()$set.planExpiresAt = new Date(now.getTime() + p.durationDays * 86400000).toISOString()
          }
          await db.collection('tenants').updateOne({ id: tenantId }, { $set })
          return json(await getTenantWithUsage(db, tenantId))
        }
      }

      if (route === '/admin/payments' && method === 'GET') {
        return json(cleanMany(await db.collection('payments').find({}).sort({ createdAt: -1 }).limit(100).toArray()))
      }
      if (path[0] === 'admin' && path[1] === 'payments' && path[2] && path[3] === 'approve' && method === 'POST') {
        const payment = await db.collection('payments').findOne({ id: path[2] })
        if (!payment) return fail('Pembayaran tidak ditemukan', 404)
        const updated = await processPaidPayment(db, clean(payment))
        return json(updated)
      }
    }

    return fail(`Endpoint ${route} tidak ditemukan (${method})`, 404)
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status)
    console.error('API Error:', err)
    return fail(err.message || 'Terjadi kesalahan pada server', 500)
  }
}
