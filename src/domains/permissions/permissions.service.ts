export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'],
  global_admin: ['*'],
  owner: ['*'],
  admin: [
    'manage_users', 'manage_settings', 'view_reports', 'manage_billing', 
    'view_dashboard', 'manage_inventory', 'manage_sales', 'manage_projects',
    'marketplace.sell', 'marketplace.manage_orders', 'marketplace.manage_products', 'marketplace.admin'
  ],
  manager: ['view_reports', 'view_dashboard', 'manage_inventory', 'manage_sales', 'manage_projects'],
  hr: ['manage_users', 'view_dashboard'],
  accountant: ['view_reports', 'manage_billing', 'view_dashboard'],
  employee: ['view_dashboard', 'view_tasks', 'create_reports', 'marketplace.sell', 'marketplace.manage_orders', 'marketplace.manage_products'],
  viewer: ['view_dashboard'],
  Personnel: ['view_dashboard', 'view_tasks', 'create_reports', 'marketplace.sell', 'marketplace.manage_orders', 'marketplace.manage_products'], // Legacy
};

export class PermissionService {
  static hasPermission(permissions: string[], isGlobalAdmin: boolean, requiredPermission: string): boolean {
    if (isGlobalAdmin || permissions.includes('*')) return true;
    return permissions.includes(requiredPermission);
  }

  static hasRole(roleName: string, activeRole: string | null, isGlobalAdmin: boolean): boolean {
    if (isGlobalAdmin) return true;
    return activeRole?.toLowerCase() === roleName.toLowerCase();
  }

  static resolvePermissions(role: string, isGlobalAdmin: boolean): string[] {
    if (isGlobalAdmin) return ['*'];
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['viewer'];
  }

  static canAccessCompany(companyId: string, isGlobalAdmin: boolean, memberships: any[]): boolean {
    if (isGlobalAdmin) return true;
    return memberships.some(m => m.company_id === companyId);
  }

  static canEditCompany(isGlobalAdmin: boolean, activeRole: string | null): boolean {
     return isGlobalAdmin || ['owner', 'admin'].includes(activeRole?.toLowerCase() || '');
  }

  static canManageMarketplace(permissions: string[], isGlobalAdmin: boolean): boolean {
    return this.hasPermission(permissions, isGlobalAdmin, 'marketplace.manage_orders');
  }

  static canViewAccounting(permissions: string[], isGlobalAdmin: boolean): boolean {
    return this.hasPermission(permissions, isGlobalAdmin, 'manage_billing');
  }

  static canManageUsers(permissions: string[], isGlobalAdmin: boolean): boolean {
    return this.hasPermission(permissions, isGlobalAdmin, 'manage_users');
  }
}
