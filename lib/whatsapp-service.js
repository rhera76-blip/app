/**
 * BABEHCHATin - WhatsApp Gateway & AI Auto-Reply Service
 * Modul backend untuk koneksi WhatsApp multi-device (Baileys) & integrasi AI.
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const { getDb } = require('@/lib/db');
const { LlmChat, UserMessage } = require('emergentintegrations');

async function connectToWhatsApp(tenantId = 'default-tenant') {
    const db = await getDb();
    
    // Menyimpan sesi auth WhatsApp per tenant secara terpisah
    const { state, saveCreds } = await useMultiFileAuthState(`sessions/${tenantId}`);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
    });

    // Handle update koneksi (QR Code, Connected, Disconnected)
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log(`[${tenantId}] Scan QR Code ini di WhatsApp Anda:`, qr);
            // Simpan QR code ke database agar bisa diambil oleh frontend dashboard
            await db.collection('tenants').updateOne(
                { id: tenantId },
                { 
                    $set: { 
                        whatsappStatus: 'qr_ready', 
                        whatsappQr: qr, 
                        updatedAt: new Date().toISOString() 
                    } 
                }
            );
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`[${tenantId}] Koneksi terputus. Mencoba terhubung kembali...`, shouldReconnect);
            
            await db.collection('tenants').updateOne(
                { id: tenantId },
                { 
                    $set: { 
                        whatsappStatus: 'disconnected', 
                        whatsappQr: null, 
                        updatedAt: new Date().toISOString() 
                    } 
                }
            );

            if (shouldReconnect) {
                connectToWhatsApp(tenantId);
            }
        } else if (connection === 'open') {
            console.log(`[${tenantId}] Berhasil terhubung ke WhatsApp! Bot AI siap melayani.`);
            
            // Perbarui status di database menjadi connected
            await db.collection('tenants').updateOne(
                { id: tenantId },
                { 
                    $set: { 
                        whatsappStatus: 'connected', 
                        whatsappQr: null, 
                        updatedAt: new Date().toISOString() 
                    } 
                }
            );
        }
    });

    // Simpan kredensial sesi saat ada perubahan
    sock.ev.on('creds.update', saveCreds);

    // Handle pesan masuk dari pelanggan
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            if (!msg.message || msg.key.fromMe) continue;

            const senderPhone = msg.key.remoteJid;
            const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text;

            if (!messageText) continue;

            console.log(`[Pesan Masuk dari ${senderPhone}]: ${messageText}`);

            try {
                // Cari chatbot yang aktif untuk tenant ini
                const chatbot = await db.collection('chatbots').findOne({ tenantId: tenantId, isActive: true });
                let aiReply = `Halo! Terima kasih sudah menghubungi kami. Pesan Anda sedang diproses.`;

                if (chatbot && process.env.EMERGENT_LLM_KEY) {
                    let prompt = chatbot.systemPrompt?.trim() || `Kamu adalah ${chatbot.name}, asisten virtual yang ramah.`;
                    const chat = new LlmChat(process.env.EMERGENT_LLM_KEY, `wa-${senderPhone}`, prompt)
                        .withModel('openai', 'gpt-4o-mini')
                        .withParams({ temperature: 0.4, max_tokens: 500 });

                    const responseStream = chat.streamMessage(new UserMessage({ text: messageText }));
                    let fullReply = '';
                    for await (const ev of responseStream) {
                        if (ev.type === 'text_delta' && ev.content) {
                            fullReply += ev.content;
                        }
                    }
                    if (fullReply) aiReply = fullReply;
                }

                // Kirim balasan otomatis AI kembali ke WhatsApp pengirim
                await sock.sendMessage(senderPhone, { text: aiReply });
            } catch (err) {
                console.error('Gagal mengirim balasan WhatsApp AI:', err);
            }
        }
    });

    return sock;
}

module.exports = { connectToWhatsApp };
