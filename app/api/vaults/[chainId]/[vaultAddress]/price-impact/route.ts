/**
 * GET /api/vaults/[chainId]/[vaultAddress]/price-impact
 *
 * Proxies to: GET /{chainId}/{vaultAddress}/historical/price-impact
 * Query params: tradeSize, startDate, endDate
 * Returns: Price impact data for specified trade size and date range
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

    // Get query parameters with defaults
    const tradeSize = searchParams.get('tradeSize') || '5000'
    const startDate = searchParams.get('startDate') || '2025-01-01T00:00:00Z'
    const endDate = searchParams.get('endDate') || '2025-11-19T23:59:59Z'

    const queryParams = new URLSearchParams({
      usdValue: tradeSize, 
      startDate,
      endDate,
    })

    const url = `${INDEXER_API_URL}/indexer/private/${chainId}/${vaultAddress}/historical/price-impact?${queryParams}`

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: {
        revalidate: 300, // Cache for 5 minutes (historical data)
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Failed to fetch price impact data',
          message: response.statusText,
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching price impact data:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
