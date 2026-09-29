export default function ContactPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-16 text-slate-800 space-y-6 leading-relaxed">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 border-b pb-4">Hubungi Kami</h1>
      <p>
        Tim dukungan teknis dan layanan pelanggan <strong>BABEHCHATin</strong> siap membantu menjawab pertanyaan, kendala operasional, maupun kebutuhan informasi kemitraan Anda.
      </p>

      <div className="bg-slate-50 border rounded-xl p-8 space-y-4 my-6 shadow-sm">
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Email Resmi Support</h3>
            <p className="text-base font-medium text-slate-900 mt-1">support@babehchatin.online</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Telegram Resmi</h3>
            <p className="text-base font-medium text-slate-900 mt-1">
              <a href="https://t.me/babehchatin" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                @babehchatin
              </a>
            </p>
          </div>
        </div>
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Jam Operasional</h3>
          <p className="text-base font-medium text-slate-900 mt-1">Senin s.d. Jumat, Pukul 09.00 - 17.00 WIB</p>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        Anda juga dapat menghubungi kami secara langsung melalui akun Telegram di atas untuk respons yang lebih cepat.
      </p>
    </main>
  )
}
