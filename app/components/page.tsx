import Link from 'next/link'

import { LiquidityProfileChart } from '@/components/liquidity'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { transformLiquidityProfile } from '@/lib/transformLiquidityProfile'
import type { LiquidityProfile } from '@/lib/types'
import type { LiveInventoryResponse, VaultMetadata } from '@/lib/types'

export const revalidate = 60

const SHOWCASE_VAULT = {
  address: '0xe20b37048bec200db1ef35669a4c8a9470ce3288',
  chainId: 1,
}

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

async function fetchFromApi<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, { cache: 'no-store', next: { revalidate: 60 } })
  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}`)
  }
  return res.json() as Promise<T>
}

async function getLiquidityShowcase() {
  const { chainId, address } = SHOWCASE_VAULT
  const [liquidityRaw, inventory, metadata] = await Promise.all([
    fetchFromApi<LiquidityProfile>(`/api/vaults/${chainId}/${address}/liquidity`),
    fetchFromApi<LiveInventoryResponse>(`/api/vaults/${chainId}/${address}/live-inventory`),
    fetchFromApi<VaultMetadata>(`/api/vaults/${chainId}/${address}`),
  ])

  const tvlUSD = inventory?.data?.totalValueUSD ?? undefined
  const profile = transformLiquidityProfile(liquidityRaw, undefined, tvlUSD)
  if (!profile) {
    throw new Error('Unable to transform liquidity profile')
  }

  return {
    profile,
    liquidityRaw,
    inventory,
    metadata,
  }
}

const formatUSD = (value?: number) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
      }).format(value)
    : '—'

export default async function ComponentsGalleryPage() {
  const showcase = await getLiquidityShowcase().catch((error) => {
    console.error('[components-page] liquidity showcase failed', error)
    return null
  })

  const token0Symbol =
    showcase?.metadata?.token0?.symbol ?? showcase?.inventory?.data?.tokens?.token0?.symbol ?? 'Token0'
  const token1Symbol =
    showcase?.metadata?.token1?.symbol ?? showcase?.inventory?.data?.tokens?.token1?.symbol ?? 'Token1'

  const tvlUSD = showcase?.inventory?.data?.totalValueUSD
  const skew = showcase?.profile?.weightedCenter ?? 0
  const pairLabel = showcase ? `${token0Symbol} / ${token1Symbol}` : 'Liquidity Pair'

  return (
    <div className="min-h-screen bg-[#0B0909] px-6 py-12 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10">
        {/* Header */}
        <header className="space-y-6 border-b border-white/[0.08] pb-8">
          <div className="flex items-center gap-2">
            <div className="h-1 w-12 bg-[#EC9117]" />
            <span className="text-xs font-medium uppercase tracking-widest text-white/50">
              Component Library
            </span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-white">
                Liquidity Distribution
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-white/60">
                Real-time visualization of liquidity concentration across price ranges. Sourced from{' '}
                <code className="rounded bg-white/5 px-1.5 py-0.5 text-sm text-white/80">
                  fetchLiquidityProfile()
                </code>{' '}
                and synchronized with live TVL data.{' '}
                <Link
                  href="https://www.figma.com/design/yNa1f7BBQyqhlxy6kpRda3/Arrakis-Challenge?node-id=5-8812&t=EztMFwycrOno31RY-11"
                  className="text-[#EC9117] underline decoration-[#EC9117]/30 underline-offset-4 hover:decoration-[#EC9117]"
                  target="_blank"
                  rel="noreferrer"
                >
                  View design specs →
                </Link>
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2">
              <div className="h-2 w-2 rounded-full bg-[#EC9117]" />
              <span className="text-xs font-medium text-white/70">Live Data</span>
            </div>
          </div>
        </header>

        {/* Main Chart Section */}
        <section className="space-y-6">
          <Card className="border-white/[0.08] bg-black/60 backdrop-blur-sm">
            <CardHeader className="space-y-1 border-b border-white/[0.06] pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold text-white">
                    {pairLabel}
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm text-white/50">
                    Chain {SHOWCASE_VAULT.chainId} · {SHOWCASE_VAULT.address.slice(0, 6)}...
                    {SHOWCASE_VAULT.address.slice(-4)}
                  </CardDescription>
                </div>
                <span className="rounded-md bg-[#EC9117]/10 px-3 py-1 text-xs font-medium text-[#EC9117]">
                  Active
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
              {/* Chart Container */}
              <div className="rounded-xl border border-white/[0.06] bg-black p-6">
                {showcase ? (
                  <LiquidityProfileChart
                    chartData={showcase.profile.points}
                    leftBound={showcase.profile.leftBound}
                    rightBound={showcase.profile.rightBound}
                    weightedCenter={showcase.profile.weightedCenter}
                    currentPrice={showcase.profile.currentPrice}
                    token0Symbol={token0Symbol}
                    token1Symbol={token1Symbol}
                    currentTick={showcase.liquidityRaw.currentTick}
                    token0Amount={showcase.inventory?.data?.tokens?.token0?.amount}
                    token1Amount={showcase.inventory?.data?.tokens?.token1?.amount}
                    token0Decimals={showcase.inventory?.data?.tokens?.token0?.decimals}
                    token1Decimals={showcase.inventory?.data?.tokens?.token1?.decimals}
                  />
                ) : (
                  <div className="flex h-[400px] items-center justify-center">
                    <div className="text-center space-y-2">
                      <div className="h-8 w-8 mx-auto rounded-full border-2 border-white/20 border-t-[#EC9117] animate-spin" />
                      <p className="text-sm text-white/40">Loading liquidity data...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Metrics Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-white/40">
                    Active Range
                  </p>
                  <p className="text-2xl font-semibold tabular-nums text-white">
                    {showcase
                      ? `${showcase.profile.leftBound.toFixed(1)}% → ${showcase.profile.rightBound.toFixed(1)}%`
                      : '—'}
                  </p>
                </div>
                <div className="space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-white/40">Skew</p>
                  <p className="text-2xl font-semibold tabular-nums text-white">
                    {showcase ? `${skew.toFixed(2)}%` : '—'}
                  </p>
                </div>
                <div className="space-y-2 rounded-lg border border-[#EC9117]/20 bg-[#EC9117]/[0.03] p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-[#EC9117]/80">
                    Total Value Locked
                  </p>
                  <p className="text-2xl font-semibold tabular-nums text-white">
                    {formatUSD(tvlUSD)}
                  </p>
                </div>
                <div className="space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-white/40">
                    Last Update
                  </p>
                  <p className="text-sm font-medium tabular-nums text-white/80">
                    {showcase?.inventory?.timestamp
                      ? new Date(showcase.inventory.timestamp).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

