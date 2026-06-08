import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fake ML Card Generator by Givy',
  description: 'Fake ML Card Generator by Givy - Buat generate kartu Mobile Legends palsu dengan berbagai rank dan border, yang belum pernah imo cocok pake ini🤭',
  robots: 'index, follow',
  authors: [{ name: 'Givy', url: 'https://wa.me/62895423300395' }],
  keywords: [
    'fake ml card',
    'fake card ml',
    'mobile legends card generator',
    'fake lobby ml',
    'generator kartu ml palsu',
    'fake rank ml',
    'prank ml',
    'fake imo ml',
    'fake legend ml',
    'givy',
  ],
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{__html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "Fake ML Card Generator",
            "description": "Buat bikin kartu Mobile Legends ga aseli",
            "author": {
              "@type": "Person",
              "name": "Givy"
            }
          })}}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
