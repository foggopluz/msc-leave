import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MSC-Leaves',
  description: 'Leave Management System — © Daniel B Shayo',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-gray-50/30">{children}</body>
    </html>
  )
}
