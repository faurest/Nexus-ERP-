import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, serverTimestamp } from '../lib/firebase';
import { db, auth, onAuthStateChanged } from './firebase';
import { getSupabase } from './supabase';
import { useAuthStore } from '../store/authStore';
import { NexusRecoveryEngine } from '../store/recoveryEngine';
import { linkNewCompanyToGlobalAdmins } from '../lib/linkNewCompanyToGlobalAdmins';

export interface CompanyCategory {
  name: string;
  isPriority: boolean;
  icon?: string;
}

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
  categories?: CompanyCategory[];
  company_members?: { role: string; status: string }[];
}

interface CompanyContextType {
  currentCompany: Company | null;
  companies: Company[];
  setCurrentCompany: (company: Company | null) => void;
  joinCompany: (code: string) => Promise<{ success: boolean; message: string }>;
  createCompany: (name: string, joinCode: string) => Promise<{ success: boolean; id?: string }>;
  loading: boolean;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType>({
  currentCompany: null,
  companies: [],
  setCurrentCompany: () => {},
  joinCompany: async () => ({ success: false, message: 'Not implemented' }),
  createCompany: async () => ({ success: false }),
  loading: true,
  refreshCompanies: async () => {},
});

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { memberships, currentCompanyId, setCurrentCompany: setZustandCompany } = useAuthStore();
  const [loading, setLoading] = useState(true);

  // Transform memberships back to "Company[]" format expected by the UI
  const companies = memberships.map(m => ({
    ...(m.companies || {}),
    id: m.company_id,
    company_members: [{ role: m.roles?.name || 'Personnel', status: m.status }]
  }));

  const currentCompany = companies.find(c => c.id === currentCompanyId) || null;

  useEffect(() => {
    // Initialize Recovery Engine
    NexusRecoveryEngine.init().then(() => setLoading(false));
  }, []);

  const handleSetCurrentCompany = (company: Company | null) => {
    setZustandCompany(company ? company.id : null);
  };

  const refreshCompanies = async () => {
    setLoading(true);
    NexusRecoveryEngine.forceSync();
    // Wait for a short time for sync to finish
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
  };

  const createCompany = async (name: string, joinCode: string): Promise<{ success: boolean; id?: string }> => {
    const user = auth.currentUser;
    if (!user) return { success: false };

    try {
      const cleanEmail = user.email?.trim().toLowerCase().replace(/\s+/g, '') || '';
      
      // 1. Create in Firestore
      const { addDoc, collection, serverTimestamp } = await import('../lib/firebase');
      const docRef = await addDoc(collection(db, 'companies'), {
        name,
        ownerId: user.uid,
        ownerEmail: cleanEmail,
        joinCode,
        createdAt: serverTimestamp()
      });

      // 2. Sync to Supabase
      const sb = getSupabase();
      if (sb) {
        const profile = useAuthStore.getState().profile;
        const { data: ownerRole } = await sb.from('roles').select('id').eq('name', 'OWNER').maybeSingle();
        
        if (profile && ownerRole) {
          try {
            const { data: compData } = await sb.from('companies').insert({
              id: docRef.id,
              name,
              owner_id: profile.id,
              owner_email: cleanEmail
            }).select().single();
  
            if (compData) {
              await sb.from('company_members').insert({
                user_id: profile.id,
                company_id: compData.id,
                role_id: ownerRole.id,
                status: 'active' });
              
              // Auto-link new company to super admins safely
              linkNewCompanyToGlobalAdmins(compData.id);
            }
          } catch (syncErr) {
            console.warn("Supabase back sync err:", syncErr);
          }
        }
      }

      await refreshCompanies();
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error("Create company error:", err);
      return { success: false };
    }
  };

  const joinCompany = async (code: string): Promise<{ success: boolean; message: string }> => {
    const user = auth.currentUser;
    if (!user || !user.email) return { success: false, message: "Vous devez être connecté." };
    
    const cleanCode = code.trim();

    try {
      const q = query(collection(db, 'companies'), where('joinCode', '==', cleanCode));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        return { success: false, message: "Code d'accès invalide." };
      }

      const companyDoc = snap.docs[0];
      const data = companyDoc.data();

      // Sync to Supabase
      const sb = getSupabase();
      if (sb) {
        const profile = useAuthStore.getState().profile;
        const { data: empRole } = await sb.from('roles').select('id').eq('name', 'Personnel').maybeSingle();
        
        if (profile && empRole) {
          try {
            await sb.from('company_members').upsert({
              user_id: profile.id,
              company_id: companyDoc.id,
              role_id: empRole.id,
              status: 'active'
            }, { onConflict: 'user_id, company_id' });
          } catch (syncErr) {}
        }
      }

      await refreshCompanies();
      return { success: true, message: `Bienvenue chez ${data.name} !` };
    } catch (error) {
      return { success: false, message: "Erreur d'adhésion." };
    }
  };

  return (
    <CompanyContext.Provider value={{ currentCompany, companies, setCurrentCompany: handleSetCurrentCompany, joinCompany, createCompany, loading, refreshCompanies }}>
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => useContext(CompanyContext);

