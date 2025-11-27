import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Arrakis Vault Dashboard | Product Designer Challenge',
  description:
    'A Next.js 14 starter for the Arrakis product designer challenge. Explore vault data, liquidity profiles, and more.',
  keywords: ['Arrakis', 'DeFi', 'Liquidity', 'Vaults', 'Web3'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <Analytics />
        <Toaster 
          theme="dark"
          toastOptions={{
            style: {
              background: '#171312',
              border: '1px solid #221C1B',
              color: '#F5EBE5',
            },
            success: {
              style: {
                background: '#171312',
                border: '1px solid #221C1B',
                color: '#F5EBE5',
              },
            },
            error: {
              style: {
                background: '#171312',
                border: '1px solid #221C1B',
                color: '#F5EBE5',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
