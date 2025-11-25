/**
 * Observability Dashboard - API Testing Page
 * 
 * Simple dashboard to verify all API functions are working correctly
 * Tests: fetchVaultDetails, fetchLiquidityProfile, fetchLiveInventory, 
 *        fetchPriceImpact, fetchFeesHistory
 */

'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RawDataDisplay } from '@/components/raw-data-display'
import { Skeleton } from '@/components/ui/skeleton'
import {
  fetchVaultDetails,
  fetchLiquidityProfile,
  fetchLiveInventory,
  fetchPriceImpact,
  fetchFeesHistory,
  TEST_VAULTS,
} from '@/lib/api'
import type {
  VaultMetadata,
  LiquidityProfile,
  LiveInventoryResponse,
  PriceImpactResponse,
  FeesHistoryResponse,
  ApiError,
} from '@/lib/types'
import { CheckCircle2, XCircle, Loader2, Play } from 'lucide-react'

type ApiTestStatus = 'idle' | 'loading' | 'success' | 'error'

interface ApiTestResult<T> {
  status: ApiTestStatus
  data?: T
  error?: ApiError
}

export default function ObservabilityDashboard() {
  const [chainId, setChainId] = React.useState<number>(1)
  const [vaultAddress, setVaultAddress] = React.useState<string>(
    TEST_VAULTS[0].address
  )

  const [vaultDetails, setVaultDetails] = React.useState<ApiTestResult<VaultMetadata>>({
    status: 'idle',
  })
  const [liquidityProfile, setLiquidityProfile] = React.useState<ApiTestResult<LiquidityProfile>>({
    status: 'idle',
  })
  const [inventoryRatio, setInventoryRatio] = React.useState<ApiTestResult<LiveInventoryResponse>>({
    status: 'idle',
  })
  const [priceImpact, setPriceImpact] = React.useState<ApiTestResult<PriceImpactResponse>>({
    status: 'idle',
  })
  const [feesHistory, setFeesHistory] = React.useState<ApiTestResult<FeesHistoryResponse>>({
    status: 'idle',
  })

  const testAllApis = async () => {
    // Reset all states
    setVaultDetails({ status: 'loading' })
    setLiquidityProfile({ status: 'loading' })
    setInventoryRatio({ status: 'loading' })
    setPriceImpact({ status: 'loading' })
    setFeesHistory({ status: 'loading' })

    // Test fetchVaultDetails
    try {
      const details = await fetchVaultDetails(chainId, vaultAddress)
      setVaultDetails({ status: 'success', data: details })
    } catch (error) {
      setVaultDetails({
        status: 'error',
        error: error as ApiError,
      })
    }

    // Test fetchLiquidityProfile
    try {
      const liquidity = await fetchLiquidityProfile(chainId, vaultAddress)
      setLiquidityProfile({ status: 'success', data: liquidity })
    } catch (error) {
      setLiquidityProfile({
        status: 'error',
        error: error as ApiError,
      })
    }

    // Test fetchLiveInventory (inventory ratio)
    try {
      const inventory = await fetchLiveInventory(chainId, vaultAddress)
      setInventoryRatio({ status: 'success', data: inventory })
    } catch (error) {
      setInventoryRatio({
        status: 'error',
        error: error as ApiError,
      })
    }

    // Test fetchPriceImpact
    try {
      const impact = await fetchPriceImpact(chainId, vaultAddress)
      setPriceImpact({ status: 'success', data: impact })
    } catch (error) {
      setPriceImpact({
        status: 'error',
        error: error as ApiError,
      })
    }

    // Test fetchFeesHistory
    try {
      const fees = await fetchFeesHistory(chainId, vaultAddress)
      setFeesHistory({ status: 'success', data: fees })
    } catch (error) {
      setFeesHistory({
        status: 'error',
        error: error as ApiError,
      })
    }
  }

  const StatusBadge = ({ status }: { status: ApiTestStatus }) => {
    switch (status) {
      case 'loading':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading
          </Badge>
        )
      case 'success':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="h-3 w-3" />
            Success
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Error
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Not tested
          </Badge>
        )
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Observability Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Test API functions and verify data flow
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Configuration Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Vault Configuration</CardTitle>
            <CardDescription>
              Select a vault to test all API functions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Chain ID
                </label>
                <input
                  type="number"
                  value={chainId}
                  onChange={(e) => setChainId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-arrakis-orange"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Vault Address
                </label>
                <input
                  type="text"
                  value={vaultAddress}
                  onChange={(e) => setVaultAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-arrakis-orange font-mono text-sm"
                />
              </div>
            </div>

            {/* Quick Select Test Vaults */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Quick Select Test Vaults
              </label>
              <div className="flex flex-wrap gap-2">
                {TEST_VAULTS.map((vault, idx) => (
                  <Button
                    key={`${vault.chainId}-${vault.address}`}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setChainId(vault.chainId)
                      setVaultAddress(vault.address)
                    }}
                    className="text-xs"
                  >
                    Chain {vault.chainId} - {vault.address.slice(0, 6)}...
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={testAllApis}
              className="w-full md:w-auto"
              disabled={
                vaultDetails.status === 'loading' ||
                liquidityProfile.status === 'loading' ||
                inventoryRatio.status === 'loading' ||
                priceImpact.status === 'loading' ||
                feesHistory.status === 'loading'
              }
            >
              <Play className="h-4 w-4 mr-2" />
              Test All APIs
            </Button>
          </CardContent>
        </Card>

        {/* API Test Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* fetchVaultDetails */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">fetchVaultDetails()</CardTitle>
                  <CardDescription>Vault metadata and basic info</CardDescription>
                </div>
                <StatusBadge status={vaultDetails.status} />
              </div>
            </CardHeader>
            <CardContent>
              {vaultDetails.status === 'loading' && (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              )}
              {vaultDetails.status === 'success' && vaultDetails.data && (
                <div className="space-y-2 text-sm">
                  {vaultDetails.data.name && (
                    <div>
                      <span className="text-muted-foreground">Name:</span>{' '}
                      <span className="font-medium">{vaultDetails.data.name}</span>
                    </div>
                  )}
                  {vaultDetails.data.symbol && (
                    <div>
                      <span className="text-muted-foreground">Symbol:</span>{' '}
                      <span className="font-medium">{vaultDetails.data.symbol}</span>
                    </div>
                  )}
                  {vaultDetails.data.tvl && (
                    <div>
                      <span className="text-muted-foreground">TVL:</span>{' '}
                      <span className="font-medium text-arrakis-orange">
                        ${parseFloat(vaultDetails.data.tvl).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {vaultDetails.data.token0?.symbol && vaultDetails.data.token1?.symbol && (
                    <div>
                      <span className="text-muted-foreground">Tokens:</span>{' '}
                      <span className="font-medium">
                        {vaultDetails.data.token0.symbol} / {vaultDetails.data.token1.symbol}
                      </span>
                    </div>
                  )}
                  <RawDataDisplay
                    data={vaultDetails.data}
                    title="Raw Response"
                    defaultExpanded={false}
                  />
                </div>
              )}
              {vaultDetails.status === 'error' && vaultDetails.error && (
                <div className="text-sm text-destructive">
                  <p className="font-medium">Error: {vaultDetails.error.error}</p>
                  <p className="text-muted-foreground mt-1">
                    {vaultDetails.error.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Status: {vaultDetails.error.statusCode}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* fetchLiquidityProfile */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">fetchLiquidityProfile()</CardTitle>
                  <CardDescription>Liquidity distribution across ticks</CardDescription>
                </div>
                <StatusBadge status={liquidityProfile.status} />
              </div>
            </CardHeader>
            <CardContent>
              {liquidityProfile.status === 'loading' && (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              )}
              {liquidityProfile.status === 'success' && liquidityProfile.data && (
                <div className="space-y-2 text-sm">
                  {liquidityProfile.data.currentPrice && (
                    <div>
                      <span className="text-muted-foreground">Current Price:</span>{' '}
                      <span className="font-medium text-arrakis-blue">
                        {liquidityProfile.data.currentPrice}
                      </span>
                    </div>
                  )}
                  {typeof liquidityProfile.data.currentTick === 'number' && (
                    <div>
                      <span className="text-muted-foreground">Current Tick:</span>{' '}
                      <span className="font-medium">{liquidityProfile.data.currentTick}</span>
                    </div>
                  )}
                  {liquidityProfile.data.ticks && (
                    <div>
                      <span className="text-muted-foreground">Ticks Count:</span>{' '}
                      <span className="font-medium">
                        {liquidityProfile.data.ticks.length} ticks
                      </span>
                    </div>
                  )}
                  {liquidityProfile.data.token0Symbol && liquidityProfile.data.token1Symbol && (
                    <div>
                      <span className="text-muted-foreground">Pair:</span>{' '}
                      <span className="font-medium">
                        {liquidityProfile.data.token0Symbol} / {liquidityProfile.data.token1Symbol}
                      </span>
                    </div>
                  )}
                  <RawDataDisplay
                    data={liquidityProfile.data}
                    title="Raw Response"
                    defaultExpanded={false}
                  />
                </div>
              )}
              {liquidityProfile.status === 'error' && liquidityProfile.error && (
                <div className="text-sm text-destructive">
                  <p className="font-medium">Error: {liquidityProfile.error.error}</p>
                  <p className="text-muted-foreground mt-1">
                    {liquidityProfile.error.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Status: {liquidityProfile.error.statusCode}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* fetchLiveInventory (Inventory Ratio) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">fetchLiveInventory()</CardTitle>
                  <CardDescription>Current inventory ratio snapshot</CardDescription>
                </div>
                <StatusBadge status={inventoryRatio.status} />
              </div>
            </CardHeader>
            <CardContent>
              {inventoryRatio.status === 'loading' && (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              )}
              {inventoryRatio.status === 'success' && inventoryRatio.data && (
                <div className="space-y-2 text-sm">
                  {inventoryRatio.data.data?.totalValueUSD !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Total Value USD:</span>{' '}
                      <span className="font-medium text-arrakis-orange">
                        ${inventoryRatio.data.data.totalValueUSD.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {inventoryRatio.data.data?.utilizationPercentage !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Utilization:</span>{' '}
                      <span className="font-medium">
                        {inventoryRatio.data.data.utilizationPercentage.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {inventoryRatio.data.data?.tokens?.token0?.symbol && inventoryRatio.data.data?.tokens?.token0?.percentage !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Token0 ({inventoryRatio.data.data.tokens.token0.symbol}):</span>{' '}
                      <span className="font-medium">
                        {inventoryRatio.data.data.tokens.token0.percentage.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {inventoryRatio.data.data?.tokens?.token1?.symbol && inventoryRatio.data.data?.tokens?.token1?.percentage !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Token1 ({inventoryRatio.data.data.tokens.token1.symbol}):</span>{' '}
                      <span className="font-medium">
                        {inventoryRatio.data.data.tokens.token1.percentage.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  <RawDataDisplay
                    data={inventoryRatio.data}
                    title="Raw Response"
                    defaultExpanded={false}
                  />
                </div>
              )}
              {inventoryRatio.status === 'error' && inventoryRatio.error && (
                <div className="text-sm text-destructive">
                  <p className="font-medium">Error: {inventoryRatio.error.error}</p>
                  <p className="text-muted-foreground mt-1">
                    {inventoryRatio.error.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Status: {inventoryRatio.error.statusCode}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* fetchPriceImpact */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">fetchPriceImpact()</CardTitle>
                  <CardDescription>Historical price impact data</CardDescription>
                </div>
                <StatusBadge status={priceImpact.status} />
              </div>
            </CardHeader>
            <CardContent>
              {priceImpact.status === 'loading' && (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              )}
              {priceImpact.status === 'success' && priceImpact.data && (
                <div className="space-y-2 text-sm">
                  {priceImpact.data.tradeSize && (
                    <div>
                      <span className="text-muted-foreground">Trade Size:</span>{' '}
                      <span className="font-medium text-arrakis-blue">
                        ${priceImpact.data.tradeSize}
                      </span>
                    </div>
                  )}
                  {priceImpact.data.data && (
                    <div>
                      <span className="text-muted-foreground">Data Points:</span>{' '}
                      <span className="font-medium">
                        {priceImpact.data.data.length} points
                      </span>
                    </div>
                  )}
                  {priceImpact.data.startDate && priceImpact.data.endDate && (
                    <div>
                      <span className="text-muted-foreground">Date Range:</span>{' '}
                      <span className="font-medium">
                        {priceImpact.data.startDate} to {priceImpact.data.endDate}
                      </span>
                    </div>
                  )}
                  {priceImpact.data.data && priceImpact.data.data.length > 0 && priceImpact.data.data[priceImpact.data.data.length - 1]?.priceImpactPercent !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Latest Impact:</span>{' '}
                      <span className="font-medium">
                        {priceImpact.data.data[priceImpact.data.data.length - 1].priceImpactPercent.toFixed(4)}%
                      </span>
                    </div>
                  )}
                  <RawDataDisplay
                    data={priceImpact.data}
                    title="Raw Response"
                    defaultExpanded={false}
                  />
                </div>
              )}
              {priceImpact.status === 'error' && priceImpact.error && (
                <div className="text-sm text-destructive">
                  <p className="font-medium">Error: {priceImpact.error.error}</p>
                  <p className="text-muted-foreground mt-1">
                    {priceImpact.error.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Status: {priceImpact.error.statusCode}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* fetchFeesHistory */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">fetchFeesHistory()</CardTitle>
                  <CardDescription>Historical fee earnings</CardDescription>
                </div>
                <StatusBadge status={feesHistory.status} />
              </div>
            </CardHeader>
            <CardContent>
              {feesHistory.status === 'loading' && (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              )}
              {feesHistory.status === 'success' && feesHistory.data && (
                <div className="space-y-2 text-sm">
                  {feesHistory.data.totalFees && (
                    <div>
                      <span className="text-muted-foreground">Total Fees:</span>{' '}
                      <span className="font-medium text-arrakis-orange">
                        ${parseFloat(feesHistory.data.totalFees).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {feesHistory.data.data && (
                    <div>
                      <span className="text-muted-foreground">Data Points:</span>{' '}
                      <span className="font-medium">
                        {feesHistory.data.data.length} days
                      </span>
                    </div>
                  )}
                  {feesHistory.data.token0Symbol && feesHistory.data.token1Symbol && (
                    <div>
                      <span className="text-muted-foreground">Pair:</span>{' '}
                      <span className="font-medium">
                        {feesHistory.data.token0Symbol} / {feesHistory.data.token1Symbol}
                      </span>
                    </div>
                  )}
                  {feesHistory.data.startDate && feesHistory.data.endDate && (
                    <div>
                      <span className="text-muted-foreground">Date Range:</span>{' '}
                      <span className="font-medium">
                        {feesHistory.data.startDate} to {feesHistory.data.endDate}
                      </span>
                    </div>
                  )}
                  <RawDataDisplay
                    data={feesHistory.data}
                    title="Raw Response"
                    defaultExpanded={false}
                  />
                </div>
              )}
              {feesHistory.status === 'error' && feesHistory.error && (
                <div className="text-sm text-destructive">
                  <p className="font-medium">Error: {feesHistory.error.error}</p>
                  <p className="text-muted-foreground mt-1">
                    {feesHistory.error.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Status: {feesHistory.error.statusCode}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Test Summary</CardTitle>
            <CardDescription>
              Overall status of all API tests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">
                  {[
                    vaultDetails.status,
                    liquidityProfile.status,
                    inventoryRatio.status,
                    priceImpact.status,
                    feesHistory.status,
                  ].filter((s) => s === 'success').length}
                </div>
                <div className="text-xs text-muted-foreground">Success</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-1 text-destructive">
                  {[
                    vaultDetails.status,
                    liquidityProfile.status,
                    inventoryRatio.status,
                    priceImpact.status,
                    feesHistory.status,
                  ].filter((s) => s === 'error').length}
                </div>
                <div className="text-xs text-muted-foreground">Errors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-1 text-arrakis-blue">
                  {[
                    vaultDetails.status,
                    liquidityProfile.status,
                    inventoryRatio.status,
                    priceImpact.status,
                    feesHistory.status,
                  ].filter((s) => s === 'loading').length}
                </div>
                <div className="text-xs text-muted-foreground">Loading</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">
                  {[
                    vaultDetails.status,
                    liquidityProfile.status,
                    inventoryRatio.status,
                    priceImpact.status,
                    feesHistory.status,
                  ].filter((s) => s === 'idle').length}
                </div>
                <div className="text-xs text-muted-foreground">Not Tested</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-1 text-arrakis-orange">5</div>
                <div className="text-xs text-muted-foreground">Total APIs</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

