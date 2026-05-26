import { ConsistencyAutoHealer } from './ConsistencyAutoHealer';
import { useAuthStore } from '../../../store/authStore';

export class ContinuousConsistencyWatchdog {
  private static intervalId: any = null;
  private static readonly WATCHDOG_INTERVAL_MS = 60000; // Check every 60 seconds

  static start() {
    if (this.intervalId) {
       console.warn('[ContinuousConsistencyWatchdog] Already running.');
       return;
    }
    
    console.log('[ContinuousConsistencyWatchdog] Booting up continuous control loop...');
    this.intervalId = setInterval(() => this.runCheckCycle(), this.WATCHDOG_INTERVAL_MS);
    
    // Also run an immediate check on startup
    setTimeout(() => this.runCheckCycle(), 2000);
  }

  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[ContinuousConsistencyWatchdog] Control loop stopped.');
    }
  }

  /**
   * Main reconciling loop (Kubernetes-style Control Loop)
   */
  private static async runCheckCycle() {
    try {
      const authState = useAuthStore.getState();
      const activeTenant = authState.activeCompany?.id;
      // In a real app we would get the userId from auth session
      const userId = 'mock_user_id'; 
      
      if (!activeTenant || !userId) {
         // No active tenant context, skip consistency check.
         return;
      }

      await ConsistencyAutoHealer.evaluateAndHeal(userId, activeTenant);
    } catch (e) {
      console.error('[ContinuousConsistencyWatchdog] Failed to complete check cycle.', e);
    }
  }
}
