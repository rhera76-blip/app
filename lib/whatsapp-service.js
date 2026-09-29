/**
 * BABEHCHATin - WhatsApp Gateway & AI Auto-Reply Service
 * Modul backend untuk koneksi WhatsApp multi-device (Baileys) & integrasi AI.
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');

async function connectToWhatsApp(tenantId = 'default-tenant') {
    // Menyimpan sesi auth WhatsApp per tenant secara terpisah
    const { state, saveCreds } = await useMultiFileAuthState(`sessions/${tenantId}`);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
    });

    // Handle update koneksi (QR Code, Connected, Disconnected)
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log(`[${tenantId}] Scan QR Code ini di WhatsApp Anda:`, qr);
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`[${tenantId}] Koneksi terputus. Mencoba terhubung kembali...`, shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp(tenantId);
            }
        } else if (connection === 'open') {
            console.log(`[${tenantId}] Berhasil terhubung ke WhatsApp! Bot AI siap melayani.`);
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

            // Respon otomatis AI untuk pelanggan UMKM
            const aiReply = `Halo! Terima kasih sudah menghubungi kami. Pesan Anda: "${messageText}" sedang diproses secara otomatis oleh BABEHCHATin AI.`;

            // Kirim balasan otomatis kembali ke WhatsApp pengirim
            await sock.sendMessage(senderPhone, { text: aiReply });
        }
    });

    return sock;
}

module.exports = { connectToWhatsApp };
