'use client'

import { useCallback } from 'react'

// Removed the complex coordinator - it was overengineered and slow.
// Instead, we just use the cache for speed.

// ===========================================
// Prefetch Cache for Vault Data
// ===========================================

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

const CACHE_TTL = 30000 // 30 seconds

class VaultDataCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private pendingRequests = new Map<string, Promise<unknown>>()

  private getKey(chainId: number, address: string, dataType: string): string {
    return `${chainId}-${address}-${dataType}`
  }

  get<T>(chainId: number, address: string, dataType: string): T | null {
    const key = this.getKey(chainId, address, dataType)
    const entry = this.cache.get(key)
    
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }

  set<T>(chainId: number, address: string, dataType: string, data: T): void {
    const key = this.getKey(chainId, address, dataType)
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_TTL,
    })
  }

  async fetchWithCache<T>(
    chainId: number,
    address: string,
    dataType: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    // Check cache first
    const cached = this.get<T>(chainId, address, dataType)
    if (cached) return cached

    const key = this.getKey(chainId, address, dataType)
    
    // Check if there's already a pending request
    const pending = this.pendingRequests.get(key)
    if (pending) return pending as Promise<T>

    // Create new request
    const request = fetcher()
      .then(data => {
        this.set(chainId, address, dataType, data)
        this.pendingRequests.delete(key)
        return data
      })
      .catch(error => {
        this.pendingRequests.delete(key)
        throw error
      })

    this.pendingRequests.set(key, request)
    return request
  }

  prefetch<T>(
    chainId: number,
    address: string,
    dataType: string,
    fetcher: () => Promise<T>
  ): void {
    // Don't prefetch if already cached
    if (this.get(chainId, address, dataType)) return
    
    // Silently prefetch in background
    this.fetchWithCache(chainId, address, dataType, fetcher).catch(() => {
      // Silently ignore prefetch errors
    })
  }

  clear(): void {
    this.cache.clear()
    this.pendingRequests.clear()
  }
}

// Singleton instance
export const vaultDataCache = new VaultDataCache()

