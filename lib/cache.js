// Shared in-memory cache for KPI + client data.
// Imported by both /api/kpis/route.js and /api/kpis/delete/route.js
// so the delete route can invalidate cache entries on successful deletion.

export const kpiCache = new Map();
export const clientCache = new Map();
export const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/** Invalidate all KPI cache entries (call after any write/delete). */
export function invalidateKPICache() {
  kpiCache.clear();
}

/** Invalidate all client cache entries (call after client create). */
export function invalidateClientCache() {
  clientCache.clear();
}
