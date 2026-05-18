import './globals.css'
import { LanguageProvider } from '@/lib/context/LanguageContext'
import { SidebarProvider } from '@/lib/context/SidebarContext'

export const metadata = {
  title: 'Prima Build',
  description: 'Prima Build Project Portal',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Prima Build',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#11144C" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <LanguageProvider>
          <SidebarProvider>
            {children}
          </SidebarProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}