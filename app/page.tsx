/**
 * Home Page - Arrakis Vault Dashboard
 *
 * This is the main starter page for the product designer challenge.
 * It displays 5 test vaults with their data fetched from the API.
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
import Link from 'next/link'
import { VaultCard } from '@/components/vault-card'
import { TEST_VAULTS } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { BarChart3, Wallet } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0B0909]">
      {/* Header */}
      <header className="border-b border-white/[0.08] bg-black/60 backdrop-blur-sm sticky top-0 z-50">
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
                className="h-5 w-auto brightness-0 invert"
              />
              <div className="h-6 w-px bg-white/20" />
              <div>
                <h1 className="text-lg font-semibold text-white">
                  Vault Dashboard
                </h1>
                <p className="text-xs text-white/50">
                  Product Designer Challenge
                </p>
              </div>
            </div>

            {/* Wallet Button (placeholder - wallet optional for this demo) */}
            <Button 
              variant="outline" 
              className="flex items-center gap-2 border-white/10 hover:bg-white/5 text-white/70"
            >
              <Wallet className="h-4 w-4" />
              Connect
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl font-bold text-white">Welcome!</h2>
            <div className="flex items-center gap-2">
              <Link href="/vaults">
                <Button variant="outline" className="flex items-center gap-2 border-white/10 hover:bg-white/5">
                  Browse Vaults
                </Button>
              </Link>
            <Link href="/data">
                <Button variant="outline" className="flex items-center gap-2 border-white/10 hover:bg-white/5">
                <BarChart3 className="h-4 w-4" />
                Data
              </Button>
            </Link>
          </div>
          </div>
          <p className="text-white/60 max-w-2xl">
            This is your starting point for the Arrakis product designer
            challenge. Below you&apos;ll find 5 test vaults with live data from the
            Arrakis API. Your task is to create a beautiful, functional
            dashboard that showcases this data.
          </p>
        </div>

        {/* Challenge Instructions Card */}
        <div className="mb-8 p-6 rounded-lg border border-[#EC9117]/30 bg-[#EC9117]/[0.08]">
          <h3 className="text-xl font-semibold mb-3 text-[#EC9117]">
            🎯 Your Challenge
          </h3>
          <div className="space-y-2 text-sm text-white">
            <p>
              Design and implement a dashboard that displays vault analytics
              including:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 text-white/60">
              <li>Vault overview with key metrics (TVL, APR, volume)</li>
              <li>Liquidity distribution charts across price ticks</li>
              <li>Historical inventory ratio (token balance over time)</li>
              <li>Price impact analysis</li>
              <li>Fee earnings visualization</li>
            </ul>
            <p className="mt-4 text-white/80">
              💡 Check the{' '}
              <code className="bg-black/50 px-2 py-1 rounded text-[#EC9117]">README.md</code>{' '}
              for detailed requirements and API documentation.
            </p>
          </div>
        </div>

        {/* Vaults Grid */}
        <div>
          <h3 className="text-2xl font-bold mb-4 text-white">Test Vaults</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEST_VAULTS.map(({ address, chainId }) => (
              <VaultCard
                key={`${chainId}-${address}`}
                vaultAddress={address}
                chainId={chainId}
              />
            ))}
          </div>
        </div>

        {/* Resources Section */}
        <div className="mt-12 p-6 rounded-lg border border-white/[0.08] bg-black/40">
          <h3 className="text-xl font-semibold mb-4 text-white">📚 Resources</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-[#EC9117] mb-2">
                API Functions
              </h4>
              <ul className="space-y-1 text-white/60">
                <li>
                  <code className="text-xs bg-black/50 px-2 py-1 rounded text-white/80">
                    fetchVaultDetails()
                  </code>
                </li>
                <li>
                  <code className="text-xs bg-black/50 px-2 py-1 rounded text-white/80">
                    fetchLiquidityProfile()
                  </code>
                </li>
                <li>
                  <code className="text-xs bg-black/50 px-2 py-1 rounded text-white/80">
                    fetchInventoryRatio()
                  </code>
                </li>
                <li>
                  <code className="text-xs bg-black/50 px-2 py-1 rounded text-white/80">
                    fetchPriceImpact()
                  </code>
                </li>
                <li>
                  <code className="text-xs bg-black/50 px-2 py-1 rounded text-white/80">
                    fetchFeesHistory()
                  </code>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-[#EC9117] mb-2">
                Key Files
              </h4>
              <ul className="space-y-1 text-white/60">
                <li>
                  <code className="text-xs bg-black/50 px-2 py-1 rounded text-white/80">
                    lib/api.ts
                  </code>{' '}
                  - API helpers
                </li>
                <li>
                  <code className="text-xs bg-black/50 px-2 py-1 rounded text-white/80">
                    lib/types.ts
                  </code>{' '}
                  - TypeScript types
                </li>
                <li>
                  <code className="text-xs bg-black/50 px-2 py-1 rounded text-white/80">
                    components/ui/
                  </code>{' '}
                  - UI components
                </li>
                <li>
                  <code className="text-xs bg-black/50 px-2 py-1 rounded text-white/80">
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
      <footer className="border-t border-white/[0.08] mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-white/50">
          <p>
            Built with Next.js 14, TypeScript, Tailwind CSS, and RainbowKit
          </p>
          <p className="mt-2">
            Powered by{' '}
            <span className="text-[#EC9117] font-semibold">Arrakis</span>{' '}
            Indexer API
          </p>
        </div>
      </footer>
    </div>
  )
}
