/**
 * Providers Component
 *
 * Wraps the app with necessary providers:
 * - WagmiProvider for Web3 functionality
 * - QueryClientProvider for React Query
 * 
 * Note: RainbowKit removed to avoid WalletConnect errors.
 * Wallet connection is optional for this dashboard.
 */

'use client'

import * as React from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from '@/lib/wallet'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
