import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'BABEHCHATin - AI Chatbot untuk Website Bisnis Anda',
  description: 'Platform AI Chatbot SaaS multi-tenant. Buat chatbot pintar, pasang di website dalam hitungan menit, layani pelanggan 24/7.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
