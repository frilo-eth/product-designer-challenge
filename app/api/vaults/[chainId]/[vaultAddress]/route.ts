/**
 * GET /api/vaults/[chainId]/[vaultAddress]
 *
 * Proxies to: GET /indexer/private/{chainId}/{vaultAddress}/details?refresh=false
 * Returns: Detailed vault metadata and summary
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

    console.log('[API] Fetching vault details:', {
      chainId,
      vaultAddress,
      timestamp: new Date().toISOString(),
    })

    const detailsUrl = `${INDEXER_API_URL}/indexer/private/${chainId}/${vaultAddress}/details?refresh=false`
    const summaryUrl = `${INDEXER_API_URL}/indexer/private/${chainId}/${vaultAddress}/summary?refresh=false`

    console.log('[API] Request URLs:', {
      details: detailsUrl,
      summary: summaryUrl,
    })

    // Fetch both details and summary in parallel
    const [detailsResponse, summaryResponse] = await Promise.all([
      fetch(detailsUrl, {
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 60 },
      }),
      fetch(summaryUrl, {
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 60 },
      }),
    ])

    console.log('[API] Response statuses:', {
      details: detailsResponse.status,
      summary: summaryResponse.status,
    })

    if (!detailsResponse.ok) {
      console.error('[API] Details fetch failed:', {
        status: detailsResponse.status,
        statusText: detailsResponse.statusText,
      })
      return NextResponse.json(
        {
          error: 'Failed to fetch vault details',
          message: detailsResponse.statusText,
        },
        { status: detailsResponse.status }
      )
    }

    const details = await detailsResponse.json()
    const summary = summaryResponse.ok ? await summaryResponse.json() : null

    // Log key information for debugging
    console.log('[API] Vault details structure:', {
      hasToken0: !!details?.data?.token0,
      hasToken1: !!details?.data?.token1,
      token0Address: details?.data?.token0?.address,
      token0Symbol: details?.data?.token0?.symbol,
      token1Address: details?.data?.token1?.address,
      token1Symbol: details?.data?.token1?.symbol,
      poolAddress: details?.data?.pool?.address || details?.data?.poolAddress,
      exchange: details?.data?.exchange,
      feeTier: details?.data?.feeTier,
      hasSummary: !!summary?.data,
    })

    // Combine the data
    const combined = {
      ...details,
      summary: summary?.data || null,
    }

    console.log('[API] Combined response keys:', Object.keys(combined))

    return NextResponse.json(combined)
  } catch (error) {
    console.error('Error fetching vault details:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
