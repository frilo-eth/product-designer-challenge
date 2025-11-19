/**
 * GET /api/vaults/[chainId]/[vaultAddress]/vault-balance
 *
 * Proxies to: GET /{chainId}/{vaultAddress}/historical/vault-balance?startDate=...&endDate=...&refresh=false
 * Returns: Historical token balance composition over time
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

    const endDate = searchParams.get('endDate') || new Date().toISOString()
    const startDate =
      searchParams.get('startDate') ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const url = new URL(
      `${INDEXER_API_URL}/indexer/private/${chainId}/${vaultAddress}/historical/vault-balance`
    )
    url.searchParams.append('startDate', startDate)
    url.searchParams.append('endDate', endDate)
    url.searchParams.append('refresh', 'false')

    const response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
      },
      next: {
        revalidate: 300, // Cache for 5 minutes
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Failed to fetch vault balance history',
          message: response.statusText,
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching vault balance history:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
