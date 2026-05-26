// @ts-nocheck
import { describe, it, expect } from 'jest';
import { PermissionService } from '../../permissions/PermissionService';
import { useAuthStore } from '../../store/authStore';

describe('Enterprise Permissions Module', () => {

  it('Global Admin should bypass module permission locks', () => {
    useAuthStore.setState({ isGlobalAdmin: true, permissions: [] });
    expect(PermissionService.canPerformAction('delete_company')).toBe(true);
    expect(PermissionService.canAccessTenant('any-tenant')).toBe(true);
  });

  it('Regular user should be restricted by explicit permissions', () => {
    useAuthStore.setState({ isGlobalAdmin: false, permissions: ['view_dashboard'] });
    expect(PermissionService.canPerformAction('view_dashboard')).toBe(true);
    expect(PermissionService.canPerformAction('delete_company')).toBe(false);
  });

  it('User should ONLY access their active tenant', () => {
    useAuthStore.setState({
      isGlobalAdmin: false,
      memberships: [{ company_id: 'tenant-123', status: 'active' }]
    });

    expect(PermissionService.canAccessTenant('tenant-123')).toBe(true);
    expect(PermissionService.canAccessTenant('tenant-456')).toBe(false); // Isolated crossing
  });

});
