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
  loading: boolean;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType>({
  currentCompany: null,
  companies: [],
  setCurrentCompany: () => {},
  joinCompany: async () => ({ success: false, message: 'Not implemented' }),
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

    // 1. SUPABASE FLOW (Primary if configured)
    if (sb) {
      try {
        console.log("Nexus Sync: Initialisation Supabase Link pour", user.uid);
        const { data: membershipData, error: sbError } = await sb
          .from('company_members')
          .select(`
            id,
            role,
            status,
            companies (
              id,
              name,
              ownerId:owner_id,
              ownerEmail:owner_email,
              logoUrl:logo_url,
              sector
            )
          `)
          .eq('firebase_uid', user.uid)
          .eq('status', 'active');

        if (membershipData && !sbError) {
          supabaseCompanies = membershipData.map((m: any) => ({
            ...m.companies,
            id: m.companies.id,
            company_members: [{ role: m.role, status: m.status }]
          }));
          console.log("Nexus Sync: Supabase Success -", supabaseCompanies.length, "entités.");
        }
      } catch (err) {
        console.error("Supabase load error:", err);
      }
    }

    // 2. FIRESTORE FLOW (Support / Fallback)
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

        // Auto-sync from personnel collection
        const qPersonnel = query(collection(db, 'personnel'), where('email', '==', cleanEmail));
        const personnelSnap = await getDocs(qPersonnel);
        const personnelCompanyIds = personnelSnap.docs.map(d => d.data().companyId).filter(Boolean);

        for (const cid of personnelCompanyIds) {
          if (!firestoreCompanies.find(c => c.id === cid)) {
             try {
               const cDoc = await getDocs(query(collection(db, 'companies'), where('id', '==', cid)));
               if (!cDoc.empty) {
                 await updateDoc(doc(db, 'companies', cid), {
                   memberEmails: arrayUnion(cleanEmail),
                   employees: arrayUnion(user.uid)
                 });
                 // Re-add to list
                 firestoreCompanies.push({ id: cid, ...cDoc.docs[0].data() } as Company);
               }
             } catch (e) { /* ignore */ }
          }
        }
      }

      // Merge and deduplicate
      const allCompaniesMap = new Map();
      [...supabaseCompanies, ...firestoreCompanies].forEach(c => {
        allCompaniesMap.set(c.id, c);
      });
      
      const finalCompanies = Array.from(allCompaniesMap.values());
      setCompanies(finalCompanies);
      
      // Auto-restore current company
      const savedId = localStorage.getItem('nexus_company_id');
      if (savedId) {
        const found = finalCompanies.find(c => c.id === savedId);
        if (found) setCurrentCompany(found);
      }
    } catch (error) {
      console.error("Firestore loading error:", error);
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

      await updateDoc(doc(db, 'companies', companyDoc.id), {
        memberEmails: arrayUnion(cleanEmail),
        employees: arrayUnion(user.uid),
        updatedAt: serverTimestamp()
      });

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
    <CompanyContext.Provider value={{ currentCompany, companies, setCurrentCompany: handleSetCurrentCompany, joinCompany, loading, refreshCompanies }}>
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => useContext(CompanyContext);

