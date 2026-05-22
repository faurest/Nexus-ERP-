import { useAuthStore } from '../store/authStore';

export const useTenant = () => {
    const { currentCompanyId, canAccessCompany, activeRole, permissions, isGlobalAdmin } = useAuthStore();
    
    return {
        tenantId: currentCompanyId,
        activeRole,
        permissions,
        isGlobalAdmin,
        canAccess: (id: string) => canAccessCompany(id),
        hasPermission: (perm: string) => isGlobalAdmin || permissions.includes('*') || permissions.includes(perm)
    };
};
