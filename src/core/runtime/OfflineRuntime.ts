import { OfflineSyncService } from '../../offline/OfflineSyncService';

/**
 * Manages the offline persistence state. 
 * Invokes multi-tab indexed DB safely and logs capabilities for Africa network specs.
 */
export class OfflineRuntime {
  static async initialize() {
     await OfflineSyncService.initializeOfflinePersistence();
  }
}
