import { BootstrapContext } from '../domain/BootstrapContext';

/**
 * Handles saving and restoring interrupted bootstrap states.
 * Crucial for mobile environments with aggressive WebViews or 3G instablity.
 */
export class RecoveryManager {
  private static STORAGE_KEY = 'NEXUS_BOOTSTRAP_PENDING';

  static saveState(context: BootstrapContext) {
    try {
       localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
           ...context,
           timestamp: Date.now()
       }));
    } catch (e) {
       console.warn('[RecoveryManager] Could not save offline recovery state (Storage full/disabled)');
    }
  }

  static getPendingState(): BootstrapContext | null {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return null;
      
      const parsed = JSON.parse(data);
      // Optional: Expire pending states older than 24h
      if (Date.now() - parsed.timestamp > 1000 * 60 * 60 * 24) {
         this.clearState();
         return null;
      }
      
      return parsed;
    } catch (e) {
      return null;
    }
  }

  static clearState() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {
      // ignore
    }
  }
}
