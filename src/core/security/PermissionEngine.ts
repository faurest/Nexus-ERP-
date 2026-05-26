import { useAuthStore } from '../../store/authStore';

/**
 * Enterprise Single Source of Truth for UX/UI Permissions.
 * Interrogates internal security managers. Never trust UI variables natively.
 */
export class PermissionEngine {
  static can(action: string, context?: any): boolean {
    const isGlobalAdmin = useAuthStore.getState().isGlobalAdmin;
    if (isGlobalAdmin) return true;

    const permissions = useAuthStore.getState().permissions || [];
    return permissions.includes(action);
  }
}
