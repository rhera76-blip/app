# BABEHCHATin - PRD & Implementation Notes

## Product
Multi-tenant B2B AI Chatbot SaaS for Indonesian businesses. Tenants configure a chatbot, embed a one-line script on their website, end users chat with streaming AI replies. Master Admin oversees tenants, payments, and global LLM config.

## Decisions (confirmed by user)
- LLM: Emergent Universal Key via `emergentintegrations` (LlmChat, default openai/gpt-4o-mini, admin-configurable)
- Payment: Tripay **MOCKED** (simulated QRIS checkout + "Simulasikan Pembayaran Berhasil" + Tripay-shaped webhook `/api/webhooks/tripay`)
- Auth: email/password (bcryptjs) + JWT (jose), stored in MongoDB
- DB: MongoDB with UUID ids (no ObjectId)
- Scope: core first (auth, dashboard, chatbot config, widget, chat API) then billing + admin - ALL DONE

## Plans (IDR)
Trial 0 (14d, 1 bot, 100 msgs) | Starter 99.000 (1 bot, 2.000) | Pro 299.000 (5 bots, 10.000) | Enterprise 999.000 (unlimited, 100.000)

## Architecture
- `app/api/[[...path]]/route.js` - all API (auth, tenant, chatbots, billing, webhooks, admin, public v1 + widget.js)
- `lib/db.js` (Mongo), `lib/auth.js` (jwt/bcrypt), `lib/plans.js`, `lib/widget-script.js` (vanilla JS widget), `lib/api-client.js`, `lib/auth-context.js`
- Pages: `/` landing, `/login`, `/register`, `/dashboard/*` (overview, chatbots, chatbots/[id] tabs, billing, settings), `/admin/*` (overview, tenants, payments, settings), `/preview/[id]` (simulated client site with widget)
- Collections: users, tenants, chatbots, chat_sessions, chat_messages, payments, settings

## Key behaviours
- Register auto-creates Trial tenant + default chatbot
- `/api/v1/chat` SSE events: meta{sessionId}, delta, done, error. Checks: bot active, domain whitelist (Origin header / body.origin; platform host + localhost always allowed; empty list = allow all; `*.dom` wildcard), tenant status, plan expiry (402), monthly quota (429). History (last 20) seeded from chat_messages.
- Knowledge base entries appended to system prompt (cap 24k chars)
- Admin seeded on first API call: admin@babehchatin.com / Admin123!

## Env (in /app/.env)
EMERGENT_LLM_KEY, OPENAI_MODEL, JWT_SECRET (added). Dev heap raised to 1024MB in package.json; heavy server packages externalized in next.config.js.

## Status
MVP complete. Backend 25/25 tests passed. Frontend verified via screenshots (frontend testing agent not yet run - awaiting user).

## Backlog / ideas
- Real Tripay integration (needs API key, private key, merchant code)
- File upload (PDF/DOCX) into knowledge base, RAG with embeddings
- Email notifications (expiry reminders), password reset
- Widget: human handoff, lead capture form, multi-language UI
- Per-chatbot analytics, CSV export of conversations
