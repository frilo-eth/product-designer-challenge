/**
 * GET /api/vaults/[chainId]/[vaultAddress]/live-inventory
 *
 * Proxies to: GET /{chainId}/{vaultAddress}/live/inventory?refresh=false
 * Returns: Current token balance snapshot (not historical)
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

    const url = `${INDEXER_API_URL}/indexer/private/${chainId}/${vaultAddress}/live/inventory?refresh=false`

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: {
        revalidate: 30, // Cache for 30 seconds (live data)
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Failed to fetch live inventory',
          message: response.statusText,
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching live inventory:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
