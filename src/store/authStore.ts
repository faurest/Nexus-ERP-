import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { resolveMarketplacePermissions } from '../lib/permissionIntegrityChecker';
import { PermissionService } from '../domains/permissions/permissions.service';

type RoleType = 
  | 'super_admin' 
  | 'global_admin' 
  | 'owner' 
  | 'admin' 
  | 'manager' 
  | 'accountant' 
  | 'hr' 
  | 'employee' 
  | 'viewer'
  | 'Personnel'; // Legacy fallback

interface AuthState {
  user: any | null; // Firebase User
  profile: any | null; // Supabase Profile (users table)
  memberships: any[]; // User's company memberships
  currentCompanyId: string | null;
  activeRole: RoleType | null;
  isGlobalAdmin: boolean;
  permissions: string[];
  
  // Actions
  setUser: (user: any) => void;
  setProfile: (profile: any) => void;
  setMemberships: (memberships: any[]) => void;
  setCurrentCompany: (companyId: string | null) => void;
  syncRoleAndPermissions: () => void;
  clearSession: () => void;
  
  // Selectors
  hasPermission: (permission: string) => boolean;
  canAccessCompany: (companyId: string) => boolean;
}

// Deleted ROLE_PERMISSIONS

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      memberships: [],
      currentCompanyId: null,
      activeRole: null,
      isGlobalAdmin: false,
      permissions: [],

      setUser: (user) => {
        set({ user });
        get().syncRoleAndPermissions();
      },

      setProfile: (profile) => set({ profile }),

      setMemberships: (memberships) => {
        set({ memberships });
        const { currentCompanyId, isGlobalAdmin } = get();
        
        // Auto-select missing workspace strategy
        if (!currentCompanyId && memberships.length > 0 ) {
          set({ currentCompanyId: memberships[0].company_id });
        }
        get().syncRoleAndPermissions();
      },

      setCurrentCompany: (companyId) => {
        set({ currentCompanyId: companyId });
        get().syncRoleAndPermissions();
      },

      syncRoleAndPermissions: () => {
        const { currentCompanyId, memberships, isGlobalAdmin } = get();
        
        if (isGlobalAdmin) {
          const basePerms = PermissionService.resolvePermissions('global_admin', true);
          set({ activeRole: 'global_admin', permissions: [...basePerms, ...resolveMarketplacePermissions(get().user, 'global_admin', true)] });
          return;
        }

        if (!currentCompanyId) {
          set({ activeRole: null, permissions: [] });
          return;
        }

        const activeMembership = memberships.find(m => m.company_id === currentCompanyId);
        
        if (activeMembership) {
          // Resolve role from DB, fallback to legacy
          const roleRaw = activeMembership.roles?.name?.toLowerCase() || activeMembership.role?.name?.toLowerCase() || 'personnel';
          let mappedRole: RoleType = 'Personnel';
          
          if (['super_admin', 'global_admin', 'owner', 'admin', 'manager', 'accountant', 'hr', 'employee', 'viewer'].includes(roleRaw)) {
              mappedRole = roleRaw as RoleType;
          } else if (roleRaw === 'administrateur' || roleRaw === 'directeur') {
              mappedRole = 'admin';
          } else if (roleRaw === 'comptable') {
              mappedRole = 'accountant';
          } else if (roleRaw === 'propriétaire') {
              mappedRole = 'owner';
          }

          set({ 
            activeRole: mappedRole, 
            permissions: PermissionService.resolvePermissions(mappedRole, false)
          });
        } else {
          set({ activeRole: null, permissions: [] });
        }
      },

      clearSession: () => set({ 
        user: null, 
        profile: null, 
        memberships: [], 
        currentCompanyId: null, 
        activeRole: null, 
        permissions: [],
        isGlobalAdmin: false 
      }),

      hasPermission: (permission: string) => {
        const { permissions, isGlobalAdmin } = get();
        if (isGlobalAdmin || permissions.includes('*')) return true;
        return permissions.includes(permission);
      },

      canAccessCompany: (companyId: string) => {
        const { isGlobalAdmin, memberships } = get();
        if (isGlobalAdmin) return true;
        return memberships.some(m => m.company_id === companyId);
      }
    }),
    {
      name: 'nexus-auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist non-sensitive, identity-related sync data
      partialize: (state) => ({ 
        currentCompanyId: state.currentCompanyId,
        isGlobalAdmin: state.isGlobalAdmin,
        activeRole: state.activeRole,
        permissions: state.permissions,
        user: state.user ? { uid: state.user.uid, email: state.user.email } : null
      }),
    }
  )
);

export const resolveEffectivePermissions = (role: string): string[] => {
  return PermissionService.resolvePermissions(role, false);
};
