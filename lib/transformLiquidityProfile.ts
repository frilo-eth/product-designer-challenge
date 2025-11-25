export interface RawLiquidityPoint {
  relativePct: number
  liquidity: number
}

interface RawLiquidityTick {
  price0?: number | string
  liquidityGross?: number | string
}

export interface RawLiquidityProfile {
  currentPrice: number | string
  currentTick?: number
  data?: RawLiquidityPoint[]
  ticks?: RawLiquidityTick[]
  token0Symbol?: string
  token1Symbol?: string
}

/**
 * BANDS FOR UNISWAP-STYLE HISTOGRAM
 *
 * Efficient  = within ±1% of price
 * Moderate   = within ±5%
 * Sparse     = everything else
 */
export type LiquidityBand = 'efficient' | 'moderate' | 'sparse'

export interface LiquidityPoint {
  pct: number
  liquidity: number
  band: LiquidityBand
}

export interface LiquidityProfileResult {
  points: LiquidityPoint[]
  leftBound: number
  rightBound: number
  weightedCenter: number
  currentPrice: number
  totalLiquidityUSD?: number // Optional: total liquidity in USD for scaling
}

export interface TransformationError {
  reason: 'no_raw_data' | 'no_current_price' | 'no_data_points'
  details?: any
}

function classifyBand(pct: number): LiquidityBand {
  const abs = Math.abs(pct)
  if (abs <= 1) return 'efficient'
  if (abs <= 5) return 'moderate'
  return 'sparse'
}

/**
 * BUCKET SIZE: 3% (matches Uniswap histogram resolution)
 */
const BUCKET = 3

function medianFilter(arr: number[], window = 5): number[] {
  const out: number[] = [];
  const half = Math.floor(window / 2);
  for (let i = 0; i < arr.length; i++) {
    const slice = arr.slice(Math.max(0, i - half), Math.min(arr.length, i + half + 1));
    const sorted = [...slice].sort((a, b) => a - b);
    out.push(sorted[Math.floor(sorted.length / 2)]);
  }
  return out;
}

function gaussianSmooth(values: number[], kernelSize = 5): number[] {
  const kernel: number[] = [];
  const sigma = kernelSize / 2;
  for (let i = 0; i < kernelSize; i++) {
    const x = i - Math.floor(kernelSize / 2);
    kernel.push(Math.exp(-(x * x) / (2 * sigma * sigma)));
  }
  const sum = kernel.reduce((a, b) => a + b, 0);
  const normalized = kernel.map(v => v / sum);
  const smoothed: number[] = [];
  for (let i = 0; i < values.length; i++) {
    let acc = 0;
    for (let k = 0; k < kernelSize; k++) {
      const idx = i + k - Math.floor(kernelSize / 2);
      if (idx >= 0 && idx < values.length) acc += values[idx] * normalized[k];
    }
    smoothed.push(acc);
  }
  return smoothed;
}

/**
 * Aggregates raw ticks/points into histogram buckets.
 */
function bucketize(points: RawLiquidityPoint[]): LiquidityPoint[] {
  if (points.length === 0) return []

  const bucketMap: Record<string, number> = {}

  // 1. compute min/max pct from ALL points (including zeros)
  // This ensures we capture the full range of the API response
  const minPct = Math.min(...points.map(p => p.relativePct))
  const maxPct = Math.max(...points.map(p => p.relativePct))

  // 2. generate continuous bucket grid (no gaps)
  // Round down/up to bucket boundaries to ensure we include edge buckets
  const bucketStart = Math.floor(minPct / BUCKET) * BUCKET
  const bucketEnd   = Math.ceil(maxPct / BUCKET) * BUCKET

  const fullBuckets: number[] = []
  // Generate all buckets from start to end, ensuring we include edge cases
  for (let v = bucketStart; v <= bucketEnd + 1e-9; v += BUCKET) {
    fullBuckets.push(parseFloat(v.toFixed(1)))
  }

  // 3. accumulate liquidity from ALL points (including zeros)
  // This ensures buckets with zero liquidity are still created
  for (const p of points) {
    const snapped = Math.round(p.relativePct / BUCKET) * BUCKET
    const bucket = parseFloat(snapped.toFixed(1))
    bucketMap[bucket] = (bucketMap[bucket] || 0) + p.liquidity
  }

  // 4. return full histogram (continuous) - includes buckets with zero liquidity
  return fullBuckets
    .map(pct => ({
      pct,
      liquidity: bucketMap[pct] || 0, // Explicitly set to 0 if no liquidity in bucket
      band: classifyBand(pct)
    }))
    .sort((a, b) => a.pct - b.pct)
}

export function transformLiquidityProfile(
  raw: RawLiquidityProfile | null | undefined,
  onError?: (e: TransformationError) => void,
  tvlUSD?: number // Optional TVL in USD for scaling liquidity values
): LiquidityProfileResult | null {
  if (!raw) {
    onError?.({ reason: 'no_raw_data' })
    return null
  }

  const currentPriceNum =
    typeof raw.currentPrice === 'string'
    ? parseFloat(raw.currentPrice) 
    : raw.currentPrice

  if (!currentPriceNum || isNaN(currentPriceNum)) {
    onError?.({
      reason: 'no_current_price',
      details: { value: raw.currentPrice },
    })
    return null
  }

  let sourcePoints: RawLiquidityPoint[] | null = null

  if (raw.data && raw.data.length > 0) {
    // Use raw.data directly - include ALL points (even with liquidity = 0)
    // This ensures we capture the full range of the API response
    sourcePoints = raw.data.map(p => ({
      relativePct: typeof p.relativePct === 'string' ? parseFloat(p.relativePct) : p.relativePct,
      liquidity: typeof p.liquidity === 'string' ? parseFloat(p.liquidity) : p.liquidity
    }))
  } else if (raw.ticks && raw.ticks.length > 0) {
    sourcePoints = raw.ticks
        .map((tick) => {
        const price = parseFloat(tick.price0?.toString() || '0')
        const liq = parseFloat(tick.liquidityGross?.toString() || '0')
        if (!isFinite(price) || price <= 0) return null
          const pct = ((price - currentPriceNum) / currentPriceNum) * 100
        return { relativePct: pct, liquidity: liq }
        })
      .filter((v): v is RawLiquidityPoint => !!v)
  }

  if (!sourcePoints || sourcePoints.length === 0) {
    onError?.({
      reason: 'no_data_points',
      details: { hasData: !!raw.data, hasTicks: !!raw.ticks },
    })
    return null
  }

  // Find the REAL edges where liquidity exists (before bucketization)
  // This helps us understand the full range of liquidity from raw API data
  const pointsWithLiquidity = sourcePoints.filter(p => p.liquidity > 0)
  const realLeftEdge = pointsWithLiquidity.length > 0 
    ? Math.min(...pointsWithLiquidity.map(p => p.relativePct))
    : sourcePoints.length > 0 ? Math.min(...sourcePoints.map(p => p.relativePct)) : 0
  const realRightEdge = pointsWithLiquidity.length > 0
    ? Math.max(...pointsWithLiquidity.map(p => p.relativePct))
    : sourcePoints.length > 0 ? Math.max(...sourcePoints.map(p => p.relativePct)) : 0

  // IMPORTANT: bucketize uses ALL sourcePoints (including zeros) to create full histogram
  // This ensures we see the complete range, not just where liquidity > 0
  const histogram = bucketize(sourcePoints)
  
  // Before smoothing, ensure we have buckets for the full range including real edges
  // Add buckets if they're missing (in case smoothing removes edge buckets)
  const histogramMin = histogram.length > 0 ? histogram[0].pct : realLeftEdge
  const histogramMax = histogram.length > 0 ? histogram[histogram.length - 1].pct : realRightEdge
  
  // Ensure histogram covers at least the real edges
  if (histogramMin > realLeftEdge || histogramMax < realRightEdge) {
    // Add missing buckets at the edges
    const missingBuckets: LiquidityPoint[] = []
    if (histogramMin > realLeftEdge) {
      const startBucket = Math.floor(realLeftEdge / BUCKET) * BUCKET
      for (let v = startBucket; v < histogramMin; v += BUCKET) {
        missingBuckets.push({
          pct: parseFloat(v.toFixed(1)),
          liquidity: 0,
          band: classifyBand(v)
        })
      }
    }
    if (histogramMax < realRightEdge) {
      const endBucket = Math.ceil(realRightEdge / BUCKET) * BUCKET
      for (let v = histogramMax + BUCKET; v <= endBucket; v += BUCKET) {
        missingBuckets.push({
          pct: parseFloat(v.toFixed(1)),
          liquidity: 0,
          band: classifyBand(v)
        })
      }
    }
    histogram.push(...missingBuckets)
    histogram.sort((a, b) => a.pct - b.pct)
  }
  
  const liquidityArray = histogram.map(h => h.liquidity);
  const median = medianFilter(liquidityArray, 5);
  const smoothed = gaussianSmooth(median, 5);
  histogram.forEach((p, i) => { p.liquidity = smoothed[i]; });

  // --- SHOW FULL HISTOGRAM - NO CROPPING ---
  // Use the ENTIRE histogram - don't crop anything
  // This ensures we see ALL buckets, including those with zero liquidity
  // The chart will show where liquidity ends naturally
  let cropped = histogram
  
  // Add extra buckets beyond the real edges to show "out of range" areas
  // This helps visualize where liquidity truly ends
  const extraBufferBuckets = 5 // 5 buckets = ~15% extra on each side
  const croppedMin = cropped.length > 0 ? cropped[0].pct : realLeftEdge
  const croppedMax = cropped.length > 0 ? cropped[cropped.length - 1].pct : realRightEdge
  
  // Add buckets before left edge
  if (croppedMin > realLeftEdge - (extraBufferBuckets * BUCKET)) {
    const startBucket = Math.floor((realLeftEdge - (extraBufferBuckets * BUCKET)) / BUCKET) * BUCKET
    const extraLeftBuckets: LiquidityPoint[] = []
    for (let v = startBucket; v < croppedMin; v += BUCKET) {
      extraLeftBuckets.push({
        pct: parseFloat(v.toFixed(1)),
        liquidity: 0,
        band: classifyBand(v)
      })
    }
    cropped = [...extraLeftBuckets, ...cropped]
  }
  
  // Add buckets after right edge
  if (croppedMax < realRightEdge + (extraBufferBuckets * BUCKET)) {
    const endBucket = Math.ceil((realRightEdge + (extraBufferBuckets * BUCKET)) / BUCKET) * BUCKET
    const extraRightBuckets: LiquidityPoint[] = []
    for (let v = croppedMax + BUCKET; v <= endBucket; v += BUCKET) {
      extraRightBuckets.push({
        pct: parseFloat(v.toFixed(1)),
        liquidity: 0,
        band: classifyBand(v)
      })
    }
    cropped = [...cropped, ...extraRightBuckets]
  }
  
  cropped.sort((a, b) => a.pct - b.pct)
  
  // Only apply buffer if we want to extend beyond the data range
  // But since we want to show everything, we'll use the full histogram
  // The chart will automatically show where liquidity drops to zero

  // Find meaningful liquidity points (where liquidity > 0) for bounds calculation
  // Use the REAL edges from raw data to ensure we capture all liquidity
  const meaningful = cropped.filter((p) => p.liquidity > 0)
  
  // Use real edges from raw data, but fallback to histogram bounds if needed
  // This ensures we capture ALL liquidity, even if smoothing made some buckets zero
  const leftBound = meaningful.length > 0 
    ? Math.min(realLeftEdge, meaningful[0].pct)
    : realLeftEdge
  const rightBound = meaningful.length > 0
    ? Math.max(realRightEdge, meaningful[meaningful.length - 1].pct)
    : realRightEdge

  const totalLiq = meaningful.length > 0 ? meaningful.reduce((s, p) => s + p.liquidity, 0) : 0
  const weightedCenter =
    totalLiq === 0
      ? 0
      : meaningful.reduce((s, p) => s + p.pct * p.liquidity, 0) / totalLiq

  // Scale liquidity values to USD if TVL is provided
  // This converts token-based liquidity units to USD for better visualization
  let scaledPoints = cropped
  if (tvlUSD && tvlUSD > 0 && totalLiq > 0) {
    // Calculate scaling factor: TVL / total liquidity in raw units
    // This assumes the raw liquidity values represent the same distribution as TVL
    const scaleFactor = tvlUSD / totalLiq
    scaledPoints = cropped.map(p => ({
      ...p,
      liquidity: p.liquidity * scaleFactor
    }))
  }

  return {
    points: scaledPoints,
    leftBound,
    rightBound,
    weightedCenter,
    currentPrice: currentPriceNum,
    totalLiquidityUSD: tvlUSD && tvlUSD > 0 ? tvlUSD : undefined,
  }
}
