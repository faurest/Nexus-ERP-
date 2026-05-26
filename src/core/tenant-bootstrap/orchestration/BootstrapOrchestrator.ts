import { BootstrapState } from '../domain/BootstrapState';
import { BootstrapContext } from '../domain/BootstrapContext';
import { BootstrapStateMachine } from '../domain/StateMachine';
import { SupabaseBootstrapRepo } from '../infrastructure/SupabaseBootstrapRepo';
import { FirebaseBootstrapRepo } from '../infrastructure/FirebaseBootstrapRepo';
import { RecoveryManager } from '../recovery/RecoveryManager';
import { useAuthStore } from '../../../store/authStore';
import { TenantRuntime } from '../../runtime/TenantRuntime';
import { BootstrapTracer } from '../../observability/tenant-bootstrap';

export class BootstrapOrchestrator {
  private static MAX_RETRIES = 3;

  /**
   * Main entry point for the tenant creation transaction.
   * Fully idempotent and capable of recovering from previous states.
   */
  static async startBootstrap(name: string, userId: string, userEmail: string): Promise<string> {
    // 1. Check for pending crash recovery
    const pending = RecoveryManager.getPendingState();
    let context: BootstrapContext;
    
    if (pending && pending.companyName === name && pending.userId === userId) {
      console.log(`[BootstrapOrchestrator] Resuming crashed bootstrap for ${name}`);
      context = pending;
    } else {
      context = {
        idempotencyKey: `boot_${userId}_${Date.now()}`,
        companyName: name,
        userId: userId,
        userEmail: userEmail,
        retryCount: 0
      };
    }

    const machine = new BootstrapStateMachine(context);
    RecoveryManager.saveState(machine.context); // Anchor initial state

    try {
      BootstrapTracer.startOperation('total_bootstrap');
      const result = await this.executeTransaction(machine);
      RecoveryManager.clearState(); // Success cleanup
      
      BootstrapTracer.traceTransition({
        userId: machine.context.userId,
        tenantId: machine.context.companyId,
        idempotencyKey: machine.context.idempotencyKey,
        stateBefore: machine.getState(),
        stateAfter: BootstrapState.COMPLETED,
        layer: 'Orchestrator',
        status: 'SUCCESS',
        operationKey: 'total_bootstrap'
      });
      BootstrapTracer.generateReport(machine.context.idempotencyKey);
      
      return result;
    } catch (error: any) {
      BootstrapTracer.generateReport(machine.context.idempotencyKey);
      return await this.handleError(machine, error);
    }
  }

  private static async executeTransaction(machine: BootstrapStateMachine): Promise<string> {
    const { context } = machine;
    
    console.log(`[BootstrapOrchestrator] Starting transaction loop for ${context.idempotencyKey}`);

    if (machine.getState() === BootstrapState.BOOTSTRAP_INIT) {
       machine.transitionTo(BootstrapState.AUTH_VALIDATED);
       if (!context.userId) throw new Error('Unauthenticated');
    }

    if (machine.getState() === BootstrapState.AUTH_VALIDATED) {
       machine.transitionTo(BootstrapState.CHECK_TENANT_EXISTENCE);
       // Optional: limit user to N tenants
    }

    if (machine.getState() === BootstrapState.CHECK_TENANT_EXISTENCE) {
       machine.transitionTo(BootstrapState.BOOTSTRAP_STARTED);
    }

    // SUPABASE SOURCE OF TRUTH CREATION
    if (machine.getState() === BootstrapState.BOOTSTRAP_STARTED) {
       machine.transitionTo(BootstrapState.COMPANY_CREATED);
       context.companyId = await SupabaseBootstrapRepo.createCompanyIdempotent(
         context.companyName, 
         context.userId, 
         context.idempotencyKey
       );
       RecoveryManager.saveState(context); // Save after critical checkpoints
    }

    if (machine.getState() === BootstrapState.COMPANY_CREATED) {
       machine.transitionTo(BootstrapState.WORKSPACE_CREATED);
       if (!context.companyId) throw new Error("Missing companyId at WORKSPACE_CREATED");
       context.workspaceId = await SupabaseBootstrapRepo.createWorkspaceIdempotent(
         context.companyId, 
         context.companyName
       );
       RecoveryManager.saveState(context);
    }

    if (machine.getState() === BootstrapState.WORKSPACE_CREATED) {
       machine.transitionTo(BootstrapState.MEMBERSHIP_CREATED);
       if (!context.companyId) throw new Error("Missing companyId at MEMBERSHIP_CREATED");
       await SupabaseBootstrapRepo.createMembershipIdempotent(context.companyId, context.userId);
       RecoveryManager.saveState(context);
    }

    // RUNTIME & PERMISSIONS PRE-LOAD
    if (machine.getState() === BootstrapState.MEMBERSHIP_CREATED) {
       machine.transitionTo(BootstrapState.PERMISSIONS_INITIALIZED);
       // Internally mapped to owner rights
    }

    // FIREBASE SYNC (REALTIME)
    if (machine.getState() === BootstrapState.PERMISSIONS_INITIALIZED) {
       machine.transitionTo(BootstrapState.SYNC_FIREBASE);
       if (!context.companyId) throw new Error("Missing companyId at SYNC_FIREBASE");
       
       await FirebaseBootstrapRepo.syncCompanyRealtime(
         context.companyId, 
         context.companyName, 
         context.userId
       );
    }

    if (machine.getState() === BootstrapState.SYNC_FIREBASE) {
       machine.transitionTo(BootstrapState.RUNTIME_INITIALIZED);
       RecoveryManager.saveState(context); // End of external IO ops
    }

    // LOCAL FRONTEND MUTATIONS (NO NETWORK RISK)
    if (machine.getState() === BootstrapState.RUNTIME_INITIALIZED) {
       machine.transitionTo(BootstrapState.CACHE_INVALIDATED);
       const oldTenantId = useAuthStore.getState().activeCompany?.id || null;
       TenantRuntime.onTenantSwitch(context.companyId!, oldTenantId);
    }

    if (machine.getState() === BootstrapState.CACHE_INVALIDATED) {
       machine.transitionTo(BootstrapState.TENANT_SWITCHED);
       useAuthStore.getState().addMembershipAndSwitch({
          company_id: context.companyId,
          company_name: context.companyName,
          role: 'owner',
          status: 'active'
       });
    }

    if (machine.getState() === BootstrapState.TENANT_SWITCHED) {
       machine.transitionTo(BootstrapState.TENANT_STABILIZING);
       // Consistency Engine will be triggered externally or mapped from Tracer
    }

    if (machine.getState() === BootstrapState.TENANT_STABILIZING) {
       machine.transitionTo(BootstrapState.COMPLETED);
    }
    return context.companyId!;
  }

  private static async handleError(machine: BootstrapStateMachine, error: Error): Promise<never> {
    const currentState = machine.getState();
    const { context } = machine;
    
    console.error(`[BootstrapOrchestrator] Fatal error during ${currentState}:`, error.message);

    // Increment retry based on network/db
    machine.incrementRetry();
    context.lastError = error.message;

    let traceLayer: any = 'System';
    let isRollback = false;

    if (currentState === BootstrapState.COMPANY_CREATED || currentState === BootstrapState.WORKSPACE_CREATED) {
      traceLayer = 'Supabase';
      machine.transitionTo(BootstrapState.ERROR_CREATION);
    } else if (currentState === BootstrapState.SYNC_FIREBASE) {
      traceLayer = 'Firebase';
      machine.transitionTo(BootstrapState.ERROR_SYNC);
      // Attempt critical rollback of Supabase since Firebase failed 
      // (This prevents Ghost tenants that have no Realtime layer).
      if (context.companyId) {
         console.warn(`[BootstrapOrchestrator] Initiating Ghost Tenant Rollback for ${context.companyId}`);
         isRollback = true;
         await SupabaseBootstrapRepo.rollbackCompany(context.companyId);
         context.companyId = undefined; // Drop ID
      }
    } else {
      machine.transitionTo(BootstrapState.ERROR_PARTIAL_STATE);
    }

    BootstrapTracer.trackError({
      userId: context.userId,
      tenantId: context.companyId,
      idempotencyKey: context.idempotencyKey,
      state: currentState,
      layer: traceLayer,
      error: error,
      isRollback
    });

    RecoveryManager.saveState(context); // Save error state for debugging or retry
    
    // Auto Retry Logic for Network hitches
    if (machine.context.retryCount < this.MAX_RETRIES && this.isNetworkError(error)) {
       console.log(`[BootstrapOrchestrator] Auto-retrying (${machine.context.retryCount}/${this.MAX_RETRIES})...`);
       return await this.executeTransaction(machine); // Recursive retry
    }

    throw new Error(`[Bootstrap Failed] ${currentState}: ${error.message} (Retries: ${context.retryCount})`);
  }

  private static isNetworkError(error: Error): boolean {
    const msg = error.message.toLowerCase();
    return msg.includes('fetch') || msg.includes('network') || msg.includes('timeout') || msg.includes('offline');
  }
}
