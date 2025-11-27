/**
 * GET /api/vaults/[chainId]/[vaultAddress]/fees-history
 *
 * Proxies to: GET /{chainId}/{vaultAddress}/historical/fees
 * Query params: startDate, endDate
 * Returns: Historical fee earnings for the vault
 */

import { NextResponse } from 'next/server'

const INDEXER_API_URL =
  process.env.NEXT_PUBLIC_INDEXER_API_URL ||
  'https://indexer-v3.api.arrakis.finance/v3'

export async function GET(
  request: Request,
  { params }: { params: { chainId: string; vaultAddress: string } }
) {
  try {
    const { chainId, vaultAddress } = params
    const { searchParams } = new URL(request.url)

    // Get query parameters with dynamic defaults (last 30 days)
    const getDefaultDateRange = () => {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - 30)
      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }
    }

    const defaults = getDefaultDateRange()
    let startDate = searchParams.get('startDate') || defaults.startDate
    let endDate = searchParams.get('endDate') || defaults.endDate
    
    // Check if we should try a longer period (if no explicit dates provided and it's the default range)
    const tryLongerPeriod = !searchParams.get('startDate') && !searchParams.get('endDate')
    const extendedRange = tryLongerPeriod ? (() => {
      const end = new Date()
      const start = new Date()
      start.setDate(end.getDate() - 90) // Try 90 days instead of 30
      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      }
    })() : null

    const queryParams = new URLSearchParams({
      startDate: extendedRange?.startDate || startDate,
      endDate: extendedRange?.endDate || endDate,
    })

    const url = `${INDEXER_API_URL}/indexer/private/${chainId}/${vaultAddress}/historical/fees?${queryParams}`

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: {
        revalidate: 300, // Cache for 5 minutes (historical data)
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorDetails
      try {
        errorDetails = JSON.parse(errorText)
      } catch {
        errorDetails = errorText
      }
      
      console.error('Fees history API error:', {
        status: response.status,
        statusText: response.statusText,
        chainId,
        vaultAddress,
        url,
        errorDetails,
      })
      
      return NextResponse.json(
        {
          error: 'Failed to fetch fees history',
          message: response.statusText,
          details: errorDetails,
          vaultAddress,
          chainId,
          requestedUrl: url,
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Fetch vault metadata to get token symbols
    let token0Symbol = data?.token0Symbol || ''
    let token1Symbol = data?.token1Symbol || ''
    
    // If token symbols not in fees response, fetch from vault details
    if (!token0Symbol || !token1Symbol) {
      try {
        const vaultUrl = `${INDEXER_API_URL}/indexer/private/${chainId}/${vaultAddress}/details?refresh=false`
        const vaultResponse = await fetch(vaultUrl, {
          headers: { 'Content-Type': 'application/json' },
          next: { revalidate: 3600 }, // Cache vault metadata for 1 hour
        })
        if (vaultResponse.ok) {
          const vaultData = await vaultResponse.json()
          token0Symbol = vaultData?.data?.tokens?.token0?.symbol || token0Symbol
          token1Symbol = vaultData?.data?.tokens?.token1?.symbol || token1Symbol
        }
      } catch {
        // Silently continue - token symbols are optional enhancement
      }
    }

    // Transform the API response to match our expected format
    // API returns: quoteTokenFees, govTokenFees, feesUSD
    // We expect: fees0, fees1, feesUSD, token0Symbol, token1Symbol
    const transformedData: {
      data: any[]
      totalFees: string
      startDate: string
      endDate: string
      token0Symbol: string
      token1Symbol: string
      allZeros?: boolean
      hasNoFees?: boolean
      triedExtendedRange?: boolean
    } = {
      data: (data?.data || []).map((point: any) => ({
        timestamp: point.timestamp || new Date(point.date + 'T00:00:00Z').toISOString(),
        date: point.date,
        fees0: point.quoteTokenFees?.toString() || '0',
        fees1: point.govTokenFees?.toString() || '0',
        feesUSD: point.feesUSD?.toString() || '0',
        volume0: point.volume0?.toString(),
        volume1: point.volume1?.toString(),
        volumeUSD: point.volumeUSD?.toString(),
      })),
      totalFees: data?.summary?.totalFeesUSD?.toString() || '0',
      startDate: data?.metadata?.requestedStartDate || startDate,
      endDate: data?.metadata?.requestedEndDate || endDate,
      token0Symbol,
      token1Symbol,
    }

    // Check if data exists but is all zeros
    const allZeros = transformedData.data.every((p: any) => 
      (!p.feesUSD || parseFloat(p.feesUSD) === 0) && 
      (!p.volumeUSD || parseFloat(p.volumeUSD) === 0)
    )
    
    if (transformedData.data.length > 0 && allZeros) {
      // If all zeros and summary also shows zero/null, this vault likely has no fees
      // Add flags to help the frontend show a better message
      if (data?.summary?.totalFeesUSD === 0 || data?.summary?.totalFeesUSD === null || data?.summary?.totalFeesUSD === undefined) {
        transformedData.allZeros = true
        transformedData.hasNoFees = true
        transformedData.triedExtendedRange = !!extendedRange
      }
    }

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error('Error fetching fees history:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
