/**
 * GET /api/vaults
 *
 * Proxies to: GET /vaults/list?refresh=false
 * Returns: List of all available vaults
 */

import { NextResponse } from 'next/server'

const INDEXER_API_URL =
  process.env.NEXT_PUBLIC_INDEXER_API_URL ||
  'https://indexer-v3.api.arrakis.finance/v3'

export async function GET() {
  try {
    const url = `${INDEXER_API_URL}/indexer/private/vaults/list?refresh=false`

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      next: {
        revalidate: 60, // Cache for 60 seconds
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Failed to fetch vaults list',
          message: response.statusText,
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching vaults list:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
