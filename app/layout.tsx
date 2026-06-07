import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fake ML Card Generator',
  description: 'Generate fake Mobile Legends lobby card',
  robots: 'noindex, nofollow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
