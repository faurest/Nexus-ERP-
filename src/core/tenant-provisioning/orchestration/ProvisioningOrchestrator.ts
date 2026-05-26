import { TenantStateMachine, ProvisioningState, ProvisioningContext } from '../domain/TenantStateMachine';
import { SupabaseRepo } from '../infrastructure/SupabaseRepo';
import { FirebaseRepo } from '../infrastructure/FirebaseRepo';
import { useAuthStore } from '../../../store/authStore';
import { TenantRuntime } from '../../runtime/TenantRuntime';

export class ProvisioningOrchestrator {
  
  static async provisionNewTenant(name: string, userId: string, userEmail: string): Promise<string> {
    const machine = new TenantStateMachine({
      userId,
      userEmail,
      companyName: name,
      retryCount: 0
    });

    try {
      // 1. VALIDATION
      machine.transitionTo(ProvisioningState.VALIDATION);
      if (!name || name.trim() === '') throw new Error('Invalid company name');
      if (!userId) throw new Error('Unidentified user');

      // 2. PERMISSION_CHECK
      machine.transitionTo(ProvisioningState.PERMISSION_CHECK);
      const isGlobalAdmin = useAuthStore.getState().isGlobalAdmin;
      // Depending on business logic, maybe any authenticated user can create a company, or only some
      // Assuming any valid user can create their own tenant:
      if (!isGlobalAdmin && !userId) {
          throw new Error('Unauthorized to provision tenant');
      }

      // 3. COMPANY_CREATION (Supabase as Authority)
      machine.transitionTo(ProvisioningState.COMPANY_CREATION);
      const companyId = await SupabaseRepo.createCompany(name, userId);
      machine.context.companyId = companyId;

      // 4. WORKSPACE_CREATION
      machine.transitionTo(ProvisioningState.WORKSPACE_CREATION);
      const workspaceId = await SupabaseRepo.createWorkspace(companyId, 'Main Workspace');
      machine.context.workspaceId = workspaceId;

      // 5. MEMBERSHIP_CREATION
      machine.transitionTo(ProvisioningState.MEMBERSHIP_CREATION);
      await SupabaseRepo.createMembership(companyId, userId, 'owner');

      // 6. SYNC_LAYER (Firebase Realtime)
      machine.transitionTo(ProvisioningState.SYNC_LAYER);
      await FirebaseRepo.syncCompanyMetadata(companyId, name, userId);

      // 7. TENANT_UPDATE
      machine.transitionTo(ProvisioningState.TENANT_UPDATE);
      
      // 8. CACHE_INVALIDATION
      machine.transitionTo(ProvisioningState.CACHE_INVALIDATION);
      // Logic handled via Runtime
      
      // 9. TENANT_SWITCH
      machine.transitionTo(ProvisioningState.TENANT_SWITCH);
      const oldTenantId = useAuthStore.getState().activeCompany?.id || null;
      TenantRuntime.onTenantSwitch(companyId, oldTenantId);
      
      // We manually update local state to reflect the new tenant immediately without refreshing
      useAuthStore.getState().addMembershipAndSwitch({
        company_id: companyId,
        company_name: name,
        role: 'owner',
        status: 'active'
      });

      // 10. COMPLETED
      machine.transitionTo(ProvisioningState.COMPLETED);
      return companyId;

    } catch (e: any) {
      return await this.handleFailure(machine, e);
    }
  }

  private static async handleFailure(machine: TenantStateMachine, error: Error): Promise<never> {
    const currentState = machine.getState();
    console.error(`[ProvisioningOrchestrator] Failed at state ${currentState}:`, error.message);

    if (currentState === ProvisioningState.COMPANY_CREATION) {
      machine.transitionTo(ProvisioningState.ERROR_DB);
    } else if (currentState === ProvisioningState.SYNC_LAYER) {
      machine.transitionTo(ProvisioningState.ERROR_SYNC);
      // Attempt Rollback
      if (machine.context.companyId) {
        await SupabaseRepo.rollbackCompany(machine.context.companyId);
      }
    } else {
      machine.transitionTo(ProvisioningState.ERROR_PARTIAL_STATE);
    }

    throw new Error(`Provisioning failed during ${currentState}: ${error.message}`);
  }
}
