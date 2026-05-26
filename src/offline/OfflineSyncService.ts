import { db } from '../lib/firebase';
import { enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';

/**
 * Enterprise Offline Resilience Layer
 * Designed for low-latency networks, 3G micro-drops, and mobile environments.
 */

export class OfflineSyncService {
  static async initializeOfflinePersistence() {
    try {
      // Opt for multi-tab persistence to prevent conflicts between multiple open views/PFAs
      await enableMultiTabIndexedDbPersistence(db);
      console.log('[Nexus ERP] Offline Mode Enabled: Multi-Tab IndexedDB Active.');
    } catch (err: any) {
      if (err.message?.includes('cache is already specified') || err.message?.includes('already enabled')) {
        console.log('[Nexus ERP] Offline Mode is natively managed by Firebase settings (persistentLocalCache).');
        return;
      }
      
      if (err.code === 'failed-precondition') {
        console.warn('[Nexus ERP] Multiple tabs open, persistence can only be enabled in one tab at a time. Trying simple indexed db...');
        try {
          await enableIndexedDbPersistence(db);
        } catch(e: any) {
           if (e.message?.includes('cache is already specified') || e.message?.includes('already enabled')) {
              console.log('[Nexus ERP] Offline Mode is natively managed by Firebase settings (persistentLocalCache).');
              return;
           }
           console.error('[Nexus ERP] Offline Mode Fallback Failed.', e);
        }
      } else if (err.code === 'unimplemented') {
        console.warn('[Nexus ERP] The current browser does not support all of the features required to enable offline persistence.');
      } else {
        console.error('[Nexus ERP] Offline Mode Fallback Failed.', err);
      }
    }
  }

  static getStaleDataProtocol() {
    // Defines rules for when cache data is considered "too stale" for enterprise use
    return {
      maxAgeMs: 1000 * 60 * 60 * 24, // 24 hours max local cache validity before forcing a remote fetch
    };
  }
}
