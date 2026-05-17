import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, or, getDocs, updateDoc, doc, arrayUnion, serverTimestamp } from '../lib/firebase';
import { db, auth, onAuthStateChanged } from './firebase';
import { getSupabase } from './supabase';

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
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const handleSetCurrentCompany = (company: Company | null) => {
    setCurrentCompany(company);
    if (company) {
      localStorage.setItem('nexus_company_id', company.id);
    } else {
      localStorage.removeItem('nexus_company_id');
    }
  };

  const refreshCompanies = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    setLoading(true);
    await loadCompanies(user);
    setLoading(false);
  };

  const loadCompanies = async (user: any) => {
    const cleanEmail = user.email ? user.email.trim().toLowerCase().replace(/\s+/g, '') : null;
    if (!cleanEmail) return;

    const sb = getSupabase();
    let supabaseCompanies: Company[] = [];

    // 1. SUPABASE FLOW (Primary Enterprise Logic)
    if (sb) {
      try {
        console.log("Nexus Hub: Fetching active memberships for", user.uid);
        // Step A: Get User internal ID
        const { data: userData } = await sb
          .from('users')
          .select('id')
          .eq('firebase_uid', user.uid)
          .single();

        if (userData) {
          // Step B: Get companies via membership table with role details
          const { data: membershipData, error: sbError } = await sb
            .from('company_members')
            .select(`
              id,
              status,
              roles (name, hierarchy_level),
              companies (
                id,
                name,
                owner_id,
                owner_email,
                logo_url,
                sector
              )
            `)
            .eq('user_id', userData.id)
            .eq('status', 'active');

          if (membershipData && !sbError) {
            supabaseCompanies = membershipData.map((m: any) => ({
              ...m.companies,
              id: m.companies.id,
              ownerId: m.companies.owner_id,
              ownerEmail: m.companies.owner_email,
              logoUrl: m.companies.logo_url,
              company_members: [{ 
                role: m.roles?.name || 'Personnel', 
                status: m.status,
                hierarchy: m.roles?.hierarchy_level 
              }]
            }));
            console.log("Nexus Hub: Supabase detected", supabaseCompanies.length, "tenants.");
          }
        }
      } catch (err) {
        console.error("Supabase hub fetch failed:", err);
      }
    }

    // 2. FIRESTORE FLOW (Legacy / Real-time Support)
    const isMaster = cleanEmail === 'hackeurfaurest@gmail.com' || cleanEmail === 'dangafelicite@gmail.com' || cleanEmail === 'yaoubaboubakary43@gmail.com';
    
    try {
      let firestoreCompanies: Company[] = [];
      
      if (isMaster) {
        const masterSnap = await getDocs(collection(db, 'companies'));
        firestoreCompanies = masterSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
      } else {
        const qMain = query(
          collection(db, 'companies'), 
          or(
            where('ownerId', '==', user.uid),
            where('memberEmails', 'array-contains', cleanEmail)
          )
        );
        const mainSnap = await getDocs(qMain);
        firestoreCompanies = mainSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
      }

      // 3. MERGE & UNIFIED IDENTITY ENGINE
      const allCompaniesMap = new Map();

      // Priority 1: Supabase (Enterprise Data)
      supabaseCompanies.forEach(c => allCompaniesMap.set(c.id, c));
      
      // Priority 2: Firestore (Metadata Merge)
      firestoreCompanies.forEach(c => {
        if (allCompaniesMap.has(c.id)) {
           // Merge Firestore metadata (like categories/nairaRate) if not in Supabase
           const existing = allCompaniesMap.get(c.id);
           allCompaniesMap.set(c.id, { ...c, ...existing });
        } else {
           allCompaniesMap.set(c.id, c);
        }
      });
      
      const finalCompanies = Array.from(allCompaniesMap.values());
      
      // Sort by active/membership status
      setCompanies(finalCompanies);
      
      const savedId = localStorage.getItem('nexus_company_id');
      if (savedId) {
        const found = finalCompanies.find(c => c.id === savedId);
        if (found) setCurrentCompany(found);
      }
    } catch (error) {
      console.error("Core Engine loading error:", error);
    }
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
        memberEmails: [cleanEmail],
        employees: [user.uid],
        joinCode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Sync to Supabase
      const sb = getSupabase();
      if (sb) {
        // Get user internal ID
        const { data: userData } = await sb.from('users').select('id').eq('firebase_uid', user.uid).single();
        const { data: ownerRole } = await sb.from('roles').select('id').eq('name', 'OWNER').single();
        
        if (userData && ownerRole) {
          const { data: compData } = await sb.from('companies').insert({
            id: docRef.id, // Keep IDs synced
            name,
            owner_id: userData.id,
            owner_email: cleanEmail
          }).select().single();

          if (compData) {
            await sb.from('company_members').insert({
              user_id: userData.id,
              company_id: compData.id,
              role_id: ownerRole.id,
              status: 'active'
            });
          }
        }
      }

      await refreshCompanies();
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error("Create company engine error:", err);
      return { success: false };
    }
  };

  const joinCompany = async (code: string): Promise<{ success: boolean; message: string }> => {
    const user = auth.currentUser;
    if (!user || !user.email) return { success: false, message: "Vous devez être connecté." };
    
    const cleanEmail = user.email.trim().toLowerCase().replace(/\s+/g, '');
    const cleanCode = code.trim();

    try {
      const q = query(collection(db, 'companies'), where('joinCode', '==', cleanCode));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        return { success: false, message: "Code d'accès invalide. Vérifiez auprès de votre responsable." };
      }

      const companyDoc = snap.docs[0];
      const data = companyDoc.data();

      // 1. Update Firestore
      await updateDoc(doc(db, 'companies', companyDoc.id), {
        memberEmails: arrayUnion(cleanEmail),
        employees: arrayUnion(user.uid),
        updatedAt: serverTimestamp()
      });

      // 2. Sync to Supabase
      const sb = getSupabase();
      if (sb) {
        const { data: userData } = await sb.from('users').select('id').eq('firebase_uid', user.uid).single();
        const { data: empRole } = await sb.from('roles').select('id').eq('name', 'EMPLOYEE').single();
        
        if (userData && empRole) {
          await sb.from('company_members').upsert({
            user_id: userData.id,
            company_id: companyDoc.id,
            role_id: empRole.id,
            status: 'active'
          }, { onConflict: 'user_id, company_id' });
        }
      }

      await refreshCompanies();
      return { success: true, message: `Bienvenue chez ${data.name} !` };
    } catch (error) {
      console.error("Join company error:", error);
      return { success: false, message: "Une erreur est survenue lors de l'adhésion." };
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCompanies([]);
        setCurrentCompany(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      await loadCompanies(user);
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <CompanyContext.Provider value={{ currentCompany, companies, setCurrentCompany: handleSetCurrentCompany, joinCompany, createCompany, loading, refreshCompanies }}>
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => useContext(CompanyContext);

