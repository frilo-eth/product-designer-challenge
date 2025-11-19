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

    // Fetch both details and summary in parallel
    const [detailsResponse, summaryResponse] = await Promise.all([
      fetch(`${INDEXER_API_URL}/indexer/private/${chainId}/${vaultAddress}/details?refresh=false`, {
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 60 },
      }),
      fetch(`${INDEXER_API_URL}/indexer/private/${chainId}/${vaultAddress}/summary?refresh=false`, {
        headers: { 'Content-Type': 'application/json' },
        next: { revalidate: 60 },
      }),
    ])

    if (!detailsResponse.ok) {
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

    // Combine the data
    const combined = {
      ...details,
      summary: summary?.data || null,
    }

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
