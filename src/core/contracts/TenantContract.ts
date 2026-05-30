export interface TenantContext {
  tenantId: string;
  name: string;
  domain?: string;
}

export interface TenantContract {
  hasActiveTenant: () => boolean;
  getActiveTenant: () => TenantContext | null;
}
