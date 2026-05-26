/**
 * QueryCachePolicy: Enterprise caching rules configuration.
 * Avoids infinite caching and memory leaks by explicitly defining freshness constraints.
 */
export class QueryCachePolicy {
  // Max time data lives in local sync cache before forcing server refetch.
  static staleTimeMs = 1000 * 60 * 60 * 24; // 24 hours

  static shouldRefresh(lastFetchTimestamp: number | null): boolean {
    if (!lastFetchTimestamp) return true;
    const now = Date.now();
    return now - lastFetchTimestamp > this.staleTimeMs;
  }
}
