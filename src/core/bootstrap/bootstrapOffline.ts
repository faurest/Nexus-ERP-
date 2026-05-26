import { OfflineSyncService } from '../../offline/OfflineSyncService';

/**
 * Ensures offline mode is bootstrapped before the React tree mounts.
 * Fails gracefully to allow execution even if IndexedDB fails (e.g. Incognito mode).
 */
export async function bootstrapOffline(): Promise<void> {
  console.log('[Nexus ERP] Bootstrapping Offline Infrastructure...');
  try {
    await OfflineSyncService.initializeOfflinePersistence();
    console.log('[Nexus ERP] Offline Infrastructure Bootstrapped.');
  } catch (error) {
    console.error('[Nexus ERP] Offline bootstrapping encountered non-fatal error:', error);
  }
}
