import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ToastProvider }  from '@/components/Toast'
import './globals.css'

export const metadata: Metadata = {
  title:       'Admin Dashboard — Coinpedia',
  description: 'QD Admin Dashboard — Manage reports, run queries, and oversee data.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        {/* Google Fonts — exact fonts from admin.html */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      {/* suppressHydrationWarning silences errors from browser extensions
          (e.g. Bitwarden) that inject attributes like bis_skin_checked
          into the DOM before React hydrates */}
      <body suppressHydrationWarning>
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
