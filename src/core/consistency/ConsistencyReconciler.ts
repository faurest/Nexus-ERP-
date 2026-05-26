import { PolicyAction } from './ConsistencyPolicyEngine';
import { useAuthStore } from '../../../store/authStore';
import { TenantRuntime } from '../../runtime/TenantRuntime';

export class ConsistencyReconciler {
  static async applyAction(action: PolicyAction, userId: string, expectedTenantId: string): Promise<boolean> {
    console.log(`[ConsistencyReconciler] Applying Action: ${action}`);

    try {
      switch (action) {
        case PolicyAction.SILENT_REFRESH:
          await this.silentRefresh();
          return true;
        
        case PolicyAction.REHYDRATE_AND_RESET:
          await this.rehydrateAndReset(expectedTenantId);
          return true;

        case PolicyAction.FREEZE_AND_RECOVER:
          await this.freezeAndRecover(expectedTenantId);
          return true;

        case PolicyAction.NONE:
        default:
          return true;
      }
    } catch (e) {
      console.error(`[ConsistencyReconciler] Failed to apply action ${action}`, e);
      return false;
    }
  }

  private static async silentRefresh() {
    // Minor drift: Usually Firebase is just slow. We can trigger a background ping
    // or just let it resolve on its own.
    console.log('[ConsistencyReconciler] Silently refreshing background state...');
  }

  private static async rehydrateAndReset(tenantId: string) {
    // Medium drift: Rebuild runtime for the expected tenant safely
    console.log(`[ConsistencyReconciler] Rehydrating permissions and rebuilding listeners for ${tenantId}...`);
    const authStore = useAuthStore.getState();
    const oldTenantId = authStore.activeCompany?.id || null;
    
    // Using existing TenantRuntime to dismantle and rebuild
    await TenantRuntime.onTenantSwitch(tenantId, oldTenantId);
  }

  private static async freezeAndRecover(tenantId: string) {
    // Critical drift: UI must be temporarily locked out or state reset completely
    console.error(`[ConsistencyReconciler] CRITICAL: Freeze and Recover initiated for ${tenantId}.`);
    // In a real scenario, this might trigger a global event that locks the UI via Zustand state
    // and forces a full page reload or a forced log out.
    // window.location.reload(); 
    
    // Temporary logic: Hard reset local cache and force Tenant Switch
    localStorage.removeItem('nexus_persist_cache');
    await TenantRuntime.onTenantSwitch(tenantId, null);
  }
}
