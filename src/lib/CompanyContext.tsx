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
        console.log("Nexus Hub: Fetching active memberships for", cleanEmail);
        
        // Helper to get user internal ID mapping safely
        const getInternalId = async () => {
          // Attempt UID lookup first (if column exists)
          try {
            const { data, error } = await sb.from('users').select('id, firebase_uid').eq('firebase_uid', user.uid).maybeSingle();
            if (!error && data) return data;
            
            // If column error or not found, try email
            if (error?.message.includes('firebase_uid') || !data) {
               const { data: emailData } = await sb.from('users').select('id, firebase_uid').eq('email', cleanEmail).maybeSingle();
               return emailData;
            }
          } catch (e) {
            return (await sb.from('users').select('id').eq('email', cleanEmail).maybeSingle()).data;
          }
          return null;
        };

        let userData = await getInternalId();

        // AUTO-REPAIR: If found by email but missing UID link, try to fix it (if possible)
        if (userData && !userData.firebase_uid && cleanEmail) {
           console.log("Nexus Hub: Linking UID to existing email record.");
           try {
             await sb.from('users').update({ firebase_uid: user.uid }).eq('id', userData.id);
           } catch (e) {
             // ignore if column still missing
           }
        }

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

          // AUTO-REPAIR: If user is in Personnel (Firestore) but NOT in Supabase memberships
          // We can't easily do this from client without knowing all companies, 
          // but we can check if the user is mentioned in any company's memberEmails in Firestore (Step 2 handles this).
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
        // We also check for 'employees' array which sometimes holds UIDs
        const qOwner = query(collection(db, 'companies'), where('ownerId', '==', user.uid));
        const qMember = query(collection(db, 'companies'), where('memberEmails', 'array-contains', cleanEmail));
        const qEmployee = query(collection(db, 'companies'), where('employees', 'array-contains', user.uid));
        
        const [ownerSnap, memberSnap, employeeSnap] = await Promise.all([
          getDocs(qOwner),
          getDocs(qMember),
          getDocs(qEmployee)
        ]);
        
        const combinedDocs = [...ownerSnap.docs, ...memberSnap.docs, ...employeeSnap.docs];
        // Deduplicate by ID
        const uniqueDocs = new Map();
        combinedDocs.forEach(d => uniqueDocs.set(d.id, { id: d.id, ...d.data() }));
        firestoreCompanies = Array.from(uniqueDocs.values()) as Company[];
      }

      // 3. MERGE & UNIFIED IDENTITY ENGINE
      const allCompaniesMap = new Map();

      // Priority 1: Supabase (Enterprise Data)
      supabaseCompanies.forEach(c => allCompaniesMap.set(c.id, c));
      
      // Priority 2: Firestore (Metadata Merge + Missing links repair)
      firestoreCompanies.forEach(c => {
        if (!allCompaniesMap.has(c.id)) {
           console.log("Nexus Hub: Found un-synced Firestore affiliation for", c.name, ". Repairing.");
           allCompaniesMap.set(c.id, c);
           
           // AUTO-REPAIR: If found in Firestore but not Supabase, try to create standard Supabase membership
           // (This happens in the background)
           if (sb) {
             const user_uid = user.uid;
             const company_id = c.id;
             const user_email = cleanEmail;
             
             (async () => {
               try {
                 const { data: uData } = await sb.from('users').select('id').eq('firebase_uid', user_uid).single();
                 const { data: rData } = await sb.from('roles').select('id').eq('name', 'Personnel').single();
                 if (uData && rData) {
                    await sb.from('company_members').upsert({
                      user_id: uData.id,
                      company_id: company_id,
                      role_id: rData.id,
                      status: 'active'
                    }, { onConflict: 'user_id, company_id' });
                    console.log("Nexus Hub: Membership auto-repaired in Supabase for", c.name);
                 }
               } catch (e) {
                 // ignore repair failures
               }
             })();
           }
        } else {
           // Merge Firestore metadata
           const existing = allCompaniesMap.get(c.id);
           allCompaniesMap.set(c.id, { ...c, ...existing });
        }
      });
      
      const finalCompanies = Array.from(allCompaniesMap.values());
      
      // Sort by active/membership status
      setCompanies(finalCompanies);
      
      const savedId = localStorage.getItem('nexus_company_id') || localStorage.getItem('nexus_last_company_id');
      if (savedId) {
        const found = finalCompanies.find(c => c.id === savedId);
        if (found) {
          setCurrentCompany(found);
          // Sync both keys for safety
          localStorage.setItem('nexus_company_id', found.id);
          localStorage.setItem('nexus_last_company_id', found.id);
        }
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
        // Get user internal ID with fallback
        const getInternalId = async () => {
          try {
            const { data } = await sb.from('users').select('id').eq('firebase_uid', user.uid).maybeSingle();
            if (data) return data;
          } catch(e) {}
          const { data } = await sb.from('users').select('id').eq('email', cleanEmail).maybeSingle();
          return data;
        };

        const userData = await getInternalId();
        const { data: ownerRole } = await sb.from('roles').select('id').eq('name', 'OWNER').maybeSingle();
        
        if (userData && ownerRole) {
          try {
            const { data: compData, error: compError } = await sb.from('companies').insert({
              name,
              owner_id: userData.id,
              owner_email: cleanEmail,
              settings: { firestore_id: docRef.id } // Store Firestore link in settings or custom col
            }).select().single();
  
            if (compData && !compError) {
              await sb.from('company_members').insert({
                user_id: userData.id,
                company_id: compData.id,
                role_id: ownerRole.id,
                status: 'active'
              });
              console.log("Nexus Hub: Supabase tenant infrastructure initialized.");
            } else if (compError) {
              console.error("Supabase company creation error:", compError.message);
            }
          } catch (syncErr) {
            console.warn("Supabase background sync partial failure:", syncErr);
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
        const getInternalId = async () => {
          try {
            const { data } = await sb.from('users').select('id').eq('firebase_uid', user.uid).maybeSingle();
            if (data) return data;
          } catch(e) {}
          const { data } = await sb.from('users').select('id').eq('email', cleanEmail).maybeSingle();
          return data;
        };

        const userData = await getInternalId();
        const { data: empRole } = await sb.from('roles').select('id').eq('name', 'EMPLOYEE').maybeSingle();
        
        if (userData && empRole) {
          try {
            await sb.from('company_members').upsert({
              user_id: userData.id,
              company_id: companyDoc.id,
              role_id: empRole.id,
              status: 'active'
            }, { onConflict: 'user_id, company_id' });
          } catch (syncErr) {
             console.warn("Supabase background join sync failure:", syncErr);
          }
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

