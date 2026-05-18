import React, { createContext, useContext, useEffect } from 'react';
import { useNexusStore } from './store';
import { auth, onAuthStateChanged } from './firebase';

export interface Company {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  memberEmails?: string[];
  joinCode?: string;
  roles?: Record<string, string[]>;
  deliveryFees?: Record<string, number>;
  employees?: any[];
  createdAt?: any;
  whatsappNumber?: string;
  nairaRate?: number;
  totalProfit?: number;
  categories?: any[];
  company_members?: { role: string; status: string }[];
}

interface CompanyContextType {
  currentCompany: any | null;
  companies: any[];
  setCurrentCompany: (company: any | null) => void;
  joinCompany: (code: string) => Promise<{ success: boolean; message: string }>;
  createCompany: (name: string, joinCode: string) => Promise<{ success: boolean; id?: string }>;
  loading: boolean;
  refreshCompanies: () => Promise<void>;
  isMaster: boolean;
}

const CompanyContext = createContext<CompanyContextType>({
  currentCompany: null,
  companies: [],
  setCurrentCompany: () => {},
  joinCompany: async () => ({ success: false, message: 'Not implemented' }),
  createCompany: async () => ({ success: false }),
  loading: true,
  refreshCompanies: async () => {},
  isMaster: false,
});

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { 
    currentCompany, 
    companies, 
    setCurrentCompany, 
    refreshAffiliations, 
    loading, 
    clearSession,
    isMaster
  } = useNexusStore();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        clearSession();
        return;
      }
      await refreshAffiliations();
    });

    return () => unsubscribeAuth();
  }, []);

  const joinCompany = async (code: string): Promise<{ success: boolean; message: string }> => {
     // Use store logic if available or keep this helper
     const { getSupabase } = await import('./supabase');
     const sb = getSupabase();
     const firebaseUser = auth.currentUser;
     if (!sb || !firebaseUser) return { success: false, message: "Système indisponible" };

     try {
       const { data: company, error: cErr } = await sb.from('companies').select('id, name').eq('join_code', code).maybeSingle();
       if (!company) return { success: false, message: "Code invalide" };

       const { data: userData } = await sb.from('users').select('id').eq('firebase_uid', firebaseUser.uid).single();
       const { data: role } = await sb.from('roles').select('id').eq('name', 'EMPLOYEE').single();

       await sb.from('company_members').upsert({
         user_id: userData.id,
         company_id: company.id,
         role_id: role.id,
         status: 'active'
       });

       await refreshAffiliations();
       return { success: true, message: `Bienvenue chez ${company.name}` };
     } catch(e) {
       return { success: false, message: "Erreur d'adhésion" };
     }
  };

  const createCompany = async (name: string, joinCode: string): Promise<{ success: boolean; id?: string }> => {
    const { getSupabase } = await import('./supabase');
    const sb = getSupabase();
    const firebaseUser = auth.currentUser;
    if (!sb || !firebaseUser) return { success: false };

    try {
      const { data: userData } = await sb.from('users').select('id').eq('firebase_uid', firebaseUser.uid).single();
      const { data: company, error: cErr } = await sb.from('companies').insert({
        name,
        join_code: joinCode,
        owner_id: userData.id,
        owner_email: firebaseUser.email
      }).select().single();

      if (company) {
        const { data: role } = await sb.from('roles').select('id').eq('name', 'OWNER').maybeSingle();
        await sb.from('company_members').insert({
          user_id: userData.id,
          company_id: company.id,
          role_id: role?.id,
          status: 'active',
          permissions: ['*']
        });
        
        // --- AUTO-LINK MASTER ADMINS ---
        const MASTER_EMAILS = [
           'hackeurfaurest@gmail.com',
           'dangafelicite@gmail.com',
           'yaoubaboubakary43@gmail.com',
           'nexus.erp.admin@gmail.com'
        ];
        
        try {
           const { data: masters } = await sb.from('users').select('id, email').in('email', MASTER_EMAILS);
           if (masters && masters.length > 0) {
              const masterInserts = masters
                 .filter(m => m.id !== userData.id) // Exclude current user if they are master
                 .map(m => ({
                    user_id: m.id,
                    company_id: company.id,
                    role_id: role?.id,
                    status: 'active',
                    permissions: ['*']
                 }));
              
              if (masterInserts.length > 0) {
                 await sb.from('company_members').insert(masterInserts);
                 console.log(`[Nexus Sync] Linked ${masterInserts.length} masters to new company.`);
              }
           }
        } catch (linkErr) {
           console.warn("[Nexus Sync] Master link on create failed", linkErr);
        }

        await refreshAffiliations();
        return { success: true, id: company.id };
      }
      return { success: false };
    } catch(e) {
      return { success: false };
    }
  };

  return (
    <CompanyContext.Provider value={{ 
      currentCompany, 
      companies, 
      setCurrentCompany, 
      joinCompany, 
      createCompany, 
      loading, 
      refreshCompanies: refreshAffiliations,
      isMaster
    }}>
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => useContext(CompanyContext);

