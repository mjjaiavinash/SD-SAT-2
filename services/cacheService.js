/**
 * Simple in-memory cache demonstration for LLD & HLD
 * Implements TTL (Time-To-Live), key-value storage, and hit/miss statistics.
 */

class CacheService {
  constructor(defaultTTL = 60) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL; // seconds
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletions: 0
    };
  }

  /**
   * Retrieve item from cache
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.stats.misses++;
      console.log(`[Cache MISS] Key: "${key}"`);
      return null;
    }

    // Check expiration
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      console.log(`[Cache EXPIRED] Key: "${key}"`);
      return null;
    }

    this.stats.hits++;
    console.log(`[Cache HIT] Key: "${key}"`);
    return item.value;
  }

  /**
   * Set item in cache with optional TTL
   */
  set(key, value, ttlSeconds = this.defaultTTL) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
    this.stats.sets++;
    console.log(`[Cache SET] Key: "${key}" (TTL: ${ttlSeconds}s)`);
    return true;
  }

  /**
   * Delete specific key
   */
  del(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletions++;
      console.log(`[Cache DEL] Key: "${key}"`);
    }
    return deleted;
  }

  /**
   * Invalidate by prefix (e.g. 'products:')
   */
  delByPrefix(prefix) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    this.stats.deletions += count;
    console.log(`[Cache INVALIDATE] Prefix: "${prefix}" (${count} keys evicted)`);
    return count;
  }

  /**
   * Clear entire cache
   */
  flush() {
    this.cache.clear();
    console.log('[Cache FLUSH] All keys cleared');
    return true;
  }

  /**
   * Get operational metrics for the HLD architecture dashboard
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRatio = totalRequests > 0 ? ((this.stats.hits / totalRequests) * 100).toFixed(1) + '%' : '0.0%';
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      deletions: this.stats.deletions,
      keysCount: this.cache.size,
      hitRatio,
      totalRequests
    };
  }
}

// Export singleton instance
module.exports = new CacheService(120);
