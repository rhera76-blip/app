// Subscription plans for BABEHCHATin (prices in IDR)
export const PLANS = {
  trial: {
    id: 'trial',
    name: 'Trial',
    price: 0,
    durationDays: 14,
    maxChatbots: 1,
    messageQuota: 100,
    features: ['1 chatbot', '100 pesan / bulan', 'Knowledge base dasar', 'Widget embed', 'Berlaku 14 hari'],
    highlight: false,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 99000,
    durationDays: 30,
    maxChatbots: 1,
    messageQuota: 2000,
    features: ['1 chatbot', '2.000 pesan / bulan', 'Knowledge base', 'Domain whitelist', 'Riwayat percakapan'],
    highlight: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 299000,
    durationDays: 30,
    maxChatbots: 5,
    messageQuota: 10000,
    features: ['5 chatbot', '10.000 pesan / bulan', 'Knowledge base tanpa batas', 'Domain whitelist', 'Kustomisasi warna & posisi', 'Prioritas support'],
    highlight: true,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 999000,
    durationDays: 30,
    maxChatbots: 999,
    messageQuota: 100000,
    features: ['Chatbot tanpa batas', '100.000 pesan / bulan', 'Semua fitur Pro', 'Dedicated support', 'SLA 99.9%'],
    highlight: false,
  },
}

export const PLAN_LIST = Object.values(PLANS)

export function getPlan(id) {
  return PLANS[id] || PLANS.trial
}

export function formatIDR(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount || 0)
}
