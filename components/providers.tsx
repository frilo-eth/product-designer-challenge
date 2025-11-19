/**
 * Providers Component
 *
 * Wraps the app with necessary providers:
 * - WagmiProvider for Web3 functionality
 * - QueryClientProvider for React Query
 * - RainbowKitProvider for wallet UI
 */

'use client'

import * as React from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { config, rainbowkitTheme } from '@/lib/wallet'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: rainbowkitTheme.accentColor,
            accentColorForeground: rainbowkitTheme.accentColorForeground,
            borderRadius: rainbowkitTheme.borderRadius,
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
