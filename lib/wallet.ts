/**
 * Wallet Configuration with RainbowKit
 *
 * This file sets up the wallet connection using RainbowKit in MOCK MODE.
 * This means users can connect without a real wallet for testing purposes.
 */

'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, base, arbitrum } from 'wagmi/chains'

/**
 * Wagmi configuration with RainbowKit
 *
 * This configuration includes:
 * - Ethereum mainnet (for vault data)
 * - Base and Arbitrum (for potential multi-chain support)
 * - Mock connectors for demo purposes
 */
export const config = getDefaultConfig({
  appName: 'Arrakis Vault Dashboard',
  projectId: 'arrakis-product-designer-challenge', // This can be any string in mock mode
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
