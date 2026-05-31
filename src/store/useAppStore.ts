import { create } from 'zustand';

interface AppState {
  // Auth State
  user: any | null;
  setUser: (user: any | null) => void;
  
  // Active Company / Tenant State
  activeCompany: any | null;
  setActiveCompany: (company: any | null) => void;
  
  // Permissions
  userRole: string;
  setUserRole: (role: string) => void;
  
  // Runtime Hydration
  hydrationComplete: boolean;
  setHydrationComplete: (status: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  
  activeCompany: null,
  setActiveCompany: (company) => set({ activeCompany: company }),
  
  userRole: 'Personnel',
  setUserRole: (role) => set({ userRole: role }),
  
  hydrationComplete: false,
  setHydrationComplete: (status) => set({ hydrationComplete: status }),
}));
