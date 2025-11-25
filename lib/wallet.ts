/**
 * Wallet Configuration with RainbowKit
 *
 * This file sets up the wallet connection using RainbowKit.
 * WalletConnect is disabled to avoid connection errors in demo mode.
 */

'use client'

import { createConfig, http } from 'wagmi'
import { mainnet, base, arbitrum } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

/**
 * Wagmi configuration WITHOUT WalletConnect
 *
 * This configuration includes:
 * - Ethereum mainnet (for vault data)
 * - Base and Arbitrum (for potential multi-chain support)
 * - Only injected wallets (MetaMask, etc.) - no WalletConnect
 * 
 * This avoids WalletConnect WebSocket errors when no project ID is configured.
 */
export const config = createConfig({
  chains: [mainnet, base, arbitrum],
  connectors: [
    injected(), // Only use injected wallets (MetaMask, etc.)
  ],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
  },
  ssr: true,
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
