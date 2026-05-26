import { RuntimeStabilityState } from './RuntimeStabilityState';
import { useAuthStore } from '../../../store/authStore';
import { TenantRuntime } from '../../runtime/TenantRuntime';

export class BootstrapRuntimeStabilityController {
  private static currentState = RuntimeStabilityState.POST_OPEN_VALIDATING;

  static getState(): RuntimeStabilityState {
    return this.currentState;
  }

  static async ensureRuntimeStability(companyId: string): Promise<RuntimeStabilityState> {
    this.currentState = RuntimeStabilityState.POST_OPEN_VALIDATING;
    console.log(`[RuntimeStabilityController] Starting post-open validation for tenant ${companyId}`);

    try {
      const isStable = await this.performStabilityChecks(companyId);

      if (isStable) {
        this.currentState = RuntimeStabilityState.STABLE_RUNTIME;
        console.log(`[RuntimeStabilityController] Tenant ${companyId} is fully stable.`);
        return this.currentState;
      } else {
        console.warn(`[RuntimeStabilityController] Instability detected for tenant ${companyId}`);
        this.currentState = RuntimeStabilityState.DEGRADED_RUNTIME;
        return await this.attemptRecovery(companyId);
      }
    } catch (error) {
      console.error(`[RuntimeStabilityController] Error during validation:`, error);
      this.currentState = RuntimeStabilityState.DEGRADED_RUNTIME;
      return await this.attemptRecovery(companyId);
    }
  }

  private static async performStabilityChecks(companyId: string): Promise<boolean> {
    const authState = useAuthStore.getState();

    // 1. Tenant match validation
    if (authState.activeCompany?.id !== companyId) {
       console.warn('[RuntimeStabilityController] -> Active company mismatch');
       return false;
    }

    // 2. Mock: Permissions hydration check
    // In a real app we'd verify user permissions are fully loaded in the store
    const hasPermissions = true; // Simulating successful check
    if (!hasPermissions) {
       console.warn('[RuntimeStabilityController] -> Permissions missing');
       return false;
    }

    // 3. Mock: Firebase listener status check
    // In a real app we'd query the TenantRuntime for listener health
    const listenersClean = true; // Simulating successful check
    if (!listenersClean) {
       console.warn('[RuntimeStabilityController] -> Firebase listeners stale/cross-tenant');
       return false;
    }

    return true;
  }

  private static async attemptRecovery(companyId: string): Promise<RuntimeStabilityState> {
    this.currentState = RuntimeStabilityState.RECOVERY_RUNTIME;
    console.log(`[RuntimeStabilityController] Attempting auto-recovery for tenant ${companyId}`);

    try {
      // 1. Purge Frontend Cache
      // localStorage.removeItem('nexus_persist_cache'); // Pseudo code for cache purge
      
      // 2. Re-trigger Tenant Switch logic to cleanly rebind everything
      const authState = useAuthStore.getState();
      const oldTenantId = authState.activeCompany?.id || null;
      
      console.log(`[RuntimeStabilityController] Rebuilding Tenant Runtime...`);
      await TenantRuntime.onTenantSwitch(companyId, oldTenantId);

      // Re-validate
      const isStable = await this.performStabilityChecks(companyId);
      
      if (isStable) {
        this.currentState = RuntimeStabilityState.STABLE_RUNTIME;
        console.log(`[RuntimeStabilityController] Recovery successful. Runtime STABLE.`);
      } else {
        this.currentState = RuntimeStabilityState.DEGRADED_RUNTIME;
        console.error(`[RuntimeStabilityController] Recovery failed. Runtime remains DEGRADED.`);
      }
      
      return this.currentState;

    } catch (error) {
      console.error(`[RuntimeStabilityController] Hard failure during recovery:`, error);
      this.currentState = RuntimeStabilityState.DEGRADED_RUNTIME;
      return this.currentState;
    }
  }
}
