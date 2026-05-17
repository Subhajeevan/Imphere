import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'IMPHERE - Build Your Standing',
    template: '%s | IMPHERE',
  },
  description: 'Civic engagement platform. Complete challenges, earn reputation, and make an impact in your community.',
  keywords: ['civic', 'community', 'challenges', 'social impact', 'volunteering'],
  authors: [{ name: 'IMPHERE' }],
  creator: 'IMPHERE',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'IMPHERE',
    title: 'IMPHERE - Build Your Standing',
    description: 'Civic engagement platform. Complete challenges, earn reputation, and make an impact in your community.',
    images: [{ url: '/logo-gold.png', width: 1024, height: 512, alt: 'IMPHERE' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IMPHERE - Build Your Standing',
    description: 'Civic engagement platform. Complete challenges, earn reputation, and make an impact in your community.',
    images: ['/logo-gold.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#D4AF37',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
