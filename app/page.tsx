/**
 * Home Page - Arrakis Vault Dashboard
 *
 * This is the main starter page for the product designer challenge.
 * It displays 3 test vaults with their data fetched from the API.
 *
 * CHALLENGE INSTRUCTIONS:
 * =======================
 * This page is intentionally simple to give you a starting point.
 * Your task is to create a beautiful, functional dashboard that:
 *
 * 1. Displays vault data in an intuitive way
 * 2. Uses charts to visualize liquidity, inventory, fees, etc.
 * 3. Implements the Arrakis design system (colors, typography, spacing)
 * 4. Provides excellent UX with loading states, animations, and responsiveness
 *
 * GETTING STARTED:
 * ================
 * - Check out lib/api.ts for all available API functions
 * - Check out lib/types.ts for TypeScript types
 * - Use components from components/ui/ (shadcn/ui)
 * - Use Recharts for data visualization
 * - Reference the Arrakis colors in tailwind.config.ts
 *
 * TIPS:
 * =====
 * - Feel free to create new components in components/
 * - You can create new pages in app/
 * - You can modify existing components
 * - Don't worry about the RainbowKit wallet - it's in mock mode for testing
 *
 * Good luck! 🚀
 */

'use client'

import * as React from 'react'
import Image from 'next/image'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { VaultCard } from '@/components/vault-card'
import { TEST_VAULTS } from '@/lib/api'

export default function Home() {
  const ETHEREUM_MAINNET = 1

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              {/* Arrakis Logo */}
              <Image
                src="/assets/icons/logo.svg"
                alt="Arrakis"
                width={107}
                height={20}
                className="h-5 w-auto"
              />
              <div className="h-6 w-px bg-slate-700" />
              <div>
                <h1 className="text-lg font-semibold text-white">
                  Vault Dashboard
                </h1>
                <p className="text-xs text-muted-foreground">
                  Product Designer Challenge
                </p>
              </div>
            </div>

            {/* Connect Wallet Button */}
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome!</h2>
          <p className="text-muted-foreground max-w-2xl">
            This is your starting point for the Arrakis product designer
            challenge. Below you&apos;ll find 3 test vaults with live data from the
            Arrakis API. Your task is to create a beautiful, functional
            dashboard that showcases this data.
          </p>
        </div>

        {/* Challenge Instructions Card */}
        <div className="mb-8 p-6 rounded-lg border border-arrakis-orange bg-arrakis-orange/10">
          <h3 className="text-xl font-semibold mb-3 text-arrakis-orange">
            🎯 Your Challenge
          </h3>
          <div className="space-y-2 text-sm">
            <p>
              Design and implement a dashboard that displays vault analytics
              including:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
              <li>Vault overview with key metrics (TVL, APR, volume)</li>
              <li>Liquidity distribution charts across price ticks</li>
              <li>Historical inventory ratio (token balance over time)</li>
              <li>Price impact analysis</li>
              <li>Fee earnings visualization</li>
            </ul>
            <p className="mt-4 text-arrakis-orange-hover">
              💡 Check the{' '}
              <code className="bg-slate-900 px-2 py-1 rounded">README.md</code>{' '}
              for detailed requirements and API documentation.
            </p>
          </div>
        </div>

        {/* Vaults Grid */}
        <div>
          <h3 className="text-2xl font-bold mb-4">Test Vaults</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEST_VAULTS.map(address => (
              <VaultCard
                key={address}
                vaultAddress={address}
                chainId={ETHEREUM_MAINNET}
              />
            ))}
          </div>
        </div>

        {/* Resources Section */}
        <div className="mt-12 p-6 rounded-lg border border-slate-700 bg-slate-900/50">
          <h3 className="text-xl font-semibold mb-4">📚 Resources</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-arrakis-blue mb-2">
                API Functions
              </h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  <code className="text-xs bg-slate-800 px-2 py-1 rounded">
                    fetchVaultDetails()
                  </code>
                </li>
                <li>
                  <code className="text-xs bg-slate-800 px-2 py-1 rounded">
                    fetchLiquidityProfile()
                  </code>
                </li>
                <li>
                  <code className="text-xs bg-slate-800 px-2 py-1 rounded">
                    fetchInventoryRatio()
                  </code>
                </li>
                <li>
                  <code className="text-xs bg-slate-800 px-2 py-1 rounded">
                    fetchPriceImpact()
                  </code>
                </li>
                <li>
                  <code className="text-xs bg-slate-800 px-2 py-1 rounded">
                    fetchFeesHistory()
                  </code>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-arrakis-blue mb-2">
                Key Files
              </h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  <code className="text-xs bg-slate-800 px-2 py-1 rounded">
                    lib/api.ts
                  </code>{' '}
                  - API helpers
                </li>
                <li>
                  <code className="text-xs bg-slate-800 px-2 py-1 rounded">
                    lib/types.ts
                  </code>{' '}
                  - TypeScript types
                </li>
                <li>
                  <code className="text-xs bg-slate-800 px-2 py-1 rounded">
                    components/ui/
                  </code>{' '}
                  - UI components
                </li>
                <li>
                  <code className="text-xs bg-slate-800 px-2 py-1 rounded">
                    tailwind.config.ts
                  </code>{' '}
                  - Arrakis colors
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Built with Next.js 14, TypeScript, Tailwind CSS, and RainbowKit
          </p>
          <p className="mt-2">
            Powered by{' '}
            <span className="text-arrakis-orange font-semibold">Arrakis</span>{' '}
            Indexer API
          </p>
        </div>
      </footer>
    </div>
  )
}
