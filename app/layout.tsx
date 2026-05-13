import './globals.css'
import { LanguageProvider } from '@/lib/context/LanguageContext'
import { SidebarProvider } from '@/lib/context/SidebarContext'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
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