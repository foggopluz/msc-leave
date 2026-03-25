import type { Metadata } from 'next'
import './globals.css'
import { DemoUserProvider } from '@/lib/demo-user'

export const metadata: Metadata = {
  title: 'Naenda',
  description: 'Leave Management System — © Daniel B Shayo',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-gray-50/30">
        <DemoUserProvider>{children}</DemoUserProvider>
      </body>
    </html>
  )
}
