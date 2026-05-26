export enum ProvisioningState {
  CREATION_INIT = 'CREATION_INIT',
  VALIDATION = 'VALIDATION',
  PERMISSION_CHECK = 'PERMISSION_CHECK',
  COMPANY_CREATION = 'COMPANY_CREATION',
  WORKSPACE_CREATION = 'WORKSPACE_CREATION',
  MEMBERSHIP_CREATION = 'MEMBERSHIP_CREATION',
  SYNC_LAYER = 'SYNC_LAYER',
  TENANT_UPDATE = 'TENANT_UPDATE',
  CACHE_INVALIDATION = 'CACHE_INVALIDATION',
  TENANT_SWITCH = 'TENANT_SWITCH',
  COMPLETED = 'COMPLETED',
  
  ERROR_VALIDATION = 'ERROR_VALIDATION',
  ERROR_PERMISSION = 'ERROR_PERMISSION',
  ERROR_DB = 'ERROR_DB',
  ERROR_SYNC = 'ERROR_SYNC',
  ERROR_PARTIAL_STATE = 'ERROR_PARTIAL_STATE',
}

export interface ProvisioningContext {
  userId: string;
  userEmail: string;
  companyName: string;
  companyId?: string;
  workspaceId?: string;
  role?: string;
  retryCount: number;
}

export class TenantStateMachine {
  private state: ProvisioningState;
  public context: ProvisioningContext;

  constructor(context: ProvisioningContext) {
    this.state = ProvisioningState.CREATION_INIT;
    this.context = { ...context, retryCount: 0 };
  }

  public getState(): ProvisioningState {
    return this.state;
  }

  public transitionTo(newState: ProvisioningState) {
    console.log(`[TenantStateMachine] Transition: ${this.state} -> ${newState}`);
    this.state = newState;
  }
}
