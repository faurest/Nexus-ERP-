import { useAuthStore } from '../../store/authStore';

/**
 * Ensures strict separation between physical tenants at the application logic layer.
 * Will throw errors if cross-contamination is detected.
 */
export class TenantSecurityManager {
  static assertTenantAccess(tenantId: string): void {
     const isGlobalAdmin = useAuthStore.getState().isGlobalAdmin;
     if (isGlobalAdmin) return;
     
     const memberships = useAuthStore.getState().memberships || [];
     const isMember = memberships.some(m => m.company_id === tenantId && m.status === 'active');
     if (!isMember) {
        throw new Error(`[Security Violation] Illegal cross-tenant bounds for tenant: ${tenantId}`);
     }
  }
}
