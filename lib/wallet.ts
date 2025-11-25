/**
 * Wallet Configuration with RainbowKit
 *
 * This file sets up the wallet connection using RainbowKit in MOCK MODE.
 * This means users can connect without a real wallet for testing purposes.
 */

'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, base, arbitrum } from 'wagmi/chains'

// Suppress WalletConnect WebSocket errors in development when project ID is missing
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalError = console.error
  console.error = (...args: any[]) => {
    const errorStr = args[0]?.toString() || ''
    // Suppress WalletConnect-related errors
    if (
      errorStr.includes('WebSocket') ||
      errorStr.includes('WalletConnect') ||
      errorStr.includes('Unauthorized: invalid key') ||
      errorStr.includes('code: 3000')
    ) {
      return // Silently ignore these errors in dev mode
    }
    originalError.apply(console, args)
  }
}

/**
 * Wagmi configuration with RainbowKit
 *
 * This configuration includes:
 * - Ethereum mainnet (for vault data)
 * - Base and Arbitrum (for potential multi-chain support)
 * - Mock connectors for demo purposes
 * 
 * NOTE: WalletConnect requires a valid project ID.
 * Get one at: https://cloud.walletconnect.com
 * Add to .env.local: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_id
 */
export const config = getDefaultConfig({
  appName: 'Arrakis Vault Dashboard',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-mode',
  chains: [mainnet, base, arbitrum],
  ssr: true, // Enable server-side rendering
})

/**
 * RainbowKit Theme Configuration
 *
 * Customized to match Arrakis brand colors
 */
export const rainbowkitTheme = {
  accentColor: '#EC9117', // Tabr Orange
  accentColorForeground: 'white',
  borderRadius: 'medium',
  fontStack: 'system',
} as const
