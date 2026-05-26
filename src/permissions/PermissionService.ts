import { useAuthStore } from '../store/authStore';

/**
 * Enterprise Permission Service
 * 
 * Centralized service to manage all roles and capabilities.
 * DO NOT use local permission checks randomly in components. Always use this service.
 */

export class PermissionService {
  
  static hasRole(requiredRole: string): boolean {
    const activeRole = useAuthStore.getState().activeRole;
    return activeRole === requiredRole;
  }

  static hasPermission(requiredPermission: string): boolean {
    const permissions = useAuthStore.getState().permissions || [];
    return permissions.includes(requiredPermission);
  }

  static canAccessCompany(companyId: string): boolean {
    const isGlobalAdmin = useAuthStore.getState().isGlobalAdmin;
    if (isGlobalAdmin) return true;

    const memberships = useAuthStore.getState().memberships || [];
    return memberships.some(m => m.company_id === companyId && m.status === 'active');
  }

  static canAccessTenant(tenantId: string): boolean {
    return this.canAccessCompany(tenantId);
  }

  static canPerformAction(actionName: string): boolean {
     const isGlobalAdmin = useAuthStore.getState().isGlobalAdmin;
     if (isGlobalAdmin) return true;
     return this.hasPermission(actionName);
  }

  static canAccessModule(moduleId: string): boolean {
    // Map module IDs to specific permissions
    const modulePermissionMap: Record<string, string> = {
      'dashboard': 'view_dashboard',
      'personnel': 'manage_personnel',
      'clients': 'manage_clients',
      'resources': 'manage_inventory',
      'projects': 'manage_projects',
      'sales': 'manage_sales',
      'admin': 'manage_settings',
      'accounting': 'manage_accounting',
      'ecommerce': 'manage_ecommerce'
    };
    
    const reqPerm = modulePermissionMap[moduleId];
    // If there's no explicitly mapped permission, default to checking if the user simply exists
    if (!reqPerm) return !!useAuthStore.getState().user; 
    
    return this.hasPermission(reqPerm);
  }

  static canManageUsers(): boolean {
    return this.hasPermission('manage_personnel');
  }

  static canManageMarketplace(): boolean {
    const isGlobalAdmin = useAuthStore.getState().isGlobalAdmin;
    if (isGlobalAdmin) return true;
    return this.hasPermission('manage_ecommerce');
  }
}
