/**
 * GET /api/vaults/[chainId]/[vaultAddress]/price-impact
 *
 * Proxies to: GET /{chainId}/{vaultAddress}/historical/price-impact
 * Query params: tradeSize, startDate, endDate
 * Returns: Price impact data for specified trade size and date range
 *
 * Normalizes the Arrakis response (buyImpacts/sellImpacts keyed objects)
 * into a flat array of PriceImpactDataPoint for the frontend.
 */

import { NextResponse } from 'next/server'

const INDEXER_API_URL =
  process.env.NEXT_PUBLIC_INDEXER_API_URL ||
  'https://indexer-v3.api.arrakis.finance/v3'

interface ArrakisPriceImpactDatum {
  timestamp: string
  buyImpacts?: Record<string, number>
  sellImpacts?: Record<string, number>
}

interface ArrakisPriceImpactResponse {
  chainId: number
  vaultId: string
  metadata?: {
    requestedStartDate?: string
    requestedEndDate?: string
    usdValue?: number[]
  }
  data?: ArrakisPriceImpactDatum[]
  timestamp?: string
  lastUpdated?: string
}

interface PriceImpactDataPoint {
  timestamp: string
  tradeSize: string
  priceImpactBps: number
  priceImpactPercent: number
  direction: 'buy' | 'sell'
}

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
    const tradeSize = searchParams.get('tradeSize') || '5000'
    const startDate = searchParams.get('startDate') || defaults.startDate
    const endDate = searchParams.get('endDate') || defaults.endDate

    const queryParams = new URLSearchParams({
      usdValue: tradeSize, 
      startDate,
      endDate,
    })

    const url = `${INDEXER_API_URL}/indexer/private/${chainId}/${vaultAddress}/historical/price-impact?${queryParams}`

    console.log('Fetching price impact from Arrakis API:', {
      chainId,
      vaultAddress,
      tradeSize,
      startDate,
      endDate,
      url,
    })

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

      console.error('Price impact API error:', {
        status: response.status,
        statusText: response.statusText,
        chainId,
        vaultAddress,
        url,
        errorDetails,
      })

      return NextResponse.json(
        {
          error: 'Failed to fetch price impact data',
          message: response.statusText,
          details: errorDetails,
          vaultAddress,
          chainId,
          requestedUrl: url,
        },
        { status: response.status }
      )
    }

    const raw: ArrakisPriceImpactResponse = await response.json()

    console.log('Price impact API response:', {
      chainId,
      vaultAddress,
      dataPoints: raw.data?.length ?? 0,
      samplePoint: raw.data?.[0] ?? 'N/A',
    })

    // Normalize into flat array expected by frontend
    const normalized: PriceImpactDataPoint[] =
      raw.data?.flatMap((entry) => {
        const points: PriceImpactDataPoint[] = []

        const addPoints = (
          impacts: Record<string, number> | undefined,
          direction: 'buy' | 'sell'
        ) => {
          if (!impacts) return

          Object.entries(impacts).forEach(([size, value]) => {
            const numeric = typeof value === 'number' ? value : Number(value)
            if (!Number.isFinite(numeric)) return

            points.push({
              timestamp: entry.timestamp,
              tradeSize: size,
              priceImpactPercent: Math.abs(numeric),
              priceImpactBps: Math.abs(numeric) * 100,
              direction,
            })
          })
        }

        addPoints(entry.buyImpacts, 'buy')
        addPoints(entry.sellImpacts, 'sell')

        return points
      }) ?? []

    return NextResponse.json({
      data: normalized,
      tradeSize,
      startDate: raw.metadata?.requestedStartDate ?? startDate,
      endDate: raw.metadata?.requestedEndDate ?? endDate,
    })
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
