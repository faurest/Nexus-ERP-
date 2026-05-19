import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { auth, db } from './firebase';
import { getSupabase } from './supabase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export interface Company {
  id: string;
  name: string;
  owner_id?: string;
  owner_email?: string;
  join_code?: string;
  logo_url?: string;
  sector?: string;
  status?: string;
  role?: string;
  permissions?: string[];
  hierarchy?: number;
  // Legacy fields for merging
  whatsappNumber?: string;
  categories?: any[];
}

interface NexusState {
  currentCompany: Company | null;
  companies: Company[];
  userProfile: any | null;
  isMaster: boolean;
  loading: boolean;
  initialized: boolean;
  
  // New States
  authLoaded: boolean;
  profileLoaded: boolean;
  companiesLoaded: boolean;
  
  // Actions
  setCurrentCompany: (company: Company | null) => Promise<void>;
  setCompanies: (companies: Company[]) => void;
  setLoading: (loading: boolean) => void;
  
  // Recovery Engine
  initNexus: () => Promise<void>;
  refreshAffiliations: () => Promise<void>;
  clearSession: () => void;
  validateCompanyAccess: (companyId: string) => Promise<{ authorized: boolean, role?: string, permissions?: string[], company?: Company }>;
}

export const MASTER_EMAILS = [
  'hackeurfaurest@gmail.com',
  'dangafelicite@gmail.com',
  'yaoubaboubakary43@gmail.com',
  'nexus.erp.admin@gmail.com'
];

export const useNexusStore = create<NexusState>()(
  persist(
    (set, get) => ({
      currentCompany: null,
      companies: [],
      userProfile: null,
      isMaster: false,
      loading: false,
      initialized: false,
      authLoaded: false,
      profileLoaded: false,
      companiesLoaded: false,

      setLoading: (loading) => set({ loading }),
      setCompanies: (companies) => set({ companies }),

      validateCompanyAccess: async (companyId: string) => {
        const { isMaster, userProfile } = get();
        console.group('[ACCESS VALIDATION]');
        console.log('User ID:', userProfile?.id || userProfile?.uid);
        console.log('Company ID:', companyId);
        console.log('Is Master:', isMaster);
        
        const sb = getSupabase();
        let companyData = null;
        
        try {
           // Get company details
           if (sb) {
             const { data: comp } = await sb.from('companies').select('*').eq('id', companyId).maybeSingle();
             companyData = comp;
           } else {
             const compSnap = await getDocs(query(collection(db, 'companies'), where('id', '==', companyId)));
             if (!compSnap.empty) {
               companyData = { id: compSnap.docs[0].id, ...compSnap.docs[0].data() };
             }
           }

           if (!companyData) {
             console.log('Result: Company not found');
             console.groupEnd();
             return { authorized: false };
           }

           if (isMaster) {
             console.log('Result: Authorized via Master Bypass');
             console.groupEnd();
             return { authorized: true, role: 'OWNER', permissions: ['*'], company: companyData as Company };
           }

           // Check Supabase first
           if (sb && userProfile?.id) {
             const { data: memberships } = await sb
               .from('company_members')
               .select(`
                 status,
                 permissions,
                 roles (name)
               `)
               .eq('user_id', userProfile.id)
               .eq('company_id', companyId)
               .eq('status', 'active');

             if (memberships && memberships.length > 0) {
               const m = memberships[0];
               console.log('Result: Authorized via company_members');
               console.groupEnd();
               return { 
                 authorized: true, 
                 role: (m.roles as any)?.name || 'Personnel', 
                 permissions: m.permissions, 
                 company: companyData as Company 
               };
             }
           }

           // Check Firebase fallback
           const fbUser = auth.currentUser;
           if (fbUser?.email) {
             const personnelRef = query(collection(db, 'personnel'), where('email', '==', fbUser.email.trim().toLowerCase()), where('companyId', '==', companyId), where('status', '==', 'active'));
             const personnelSnap = await getDocs(personnelRef);
             
             if (!personnelSnap.empty) {
               const pData = personnelSnap.docs[0].data();
               console.log('Result: Authorized via personnel (Firebase)');
               console.groupEnd();
               return { 
                 authorized: true, 
                 role: pData.role || 'Personnel', 
                 permissions: pData.permissions || [], 
                 company: companyData as Company 
               };
             }
           }
           
           console.log('Result: Unauthorized');
           console.groupEnd();
           return { authorized: false };
        } catch (err) {
           console.error('Validation error:', err);
           console.groupEnd();
           return { authorized: false };
        }
      },

      setCurrentCompany: async (company) => {
        set({ currentCompany: company });
        
        // Persist to Supabase in background
        const firebaseUser = auth.currentUser;
        const sb = getSupabase();
        if (sb && firebaseUser && company) {
          try {
             await sb.from('users').update({ 
               current_company_id: company.id,
               last_login: new Date().toISOString()
             }).eq('firebase_uid', firebaseUser.uid);
          } catch (e) {
             console.warn("Nexus Store: Workspace target persistence failed", e);
          }
        }
      },

      clearSession: () => {
        set({ currentCompany: null, companies: [], userProfile: null, initialized: false });
      },

      refreshAffiliations: async () => {
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) return;
        
        set({ loading: true, authLoaded: true });
        const cleanEmail = firebaseUser.email?.trim().toLowerCase().replace(/\s+/g, '') || '';
        const sb = getSupabase();
        
        const isMaster = MASTER_EMAILS.includes(cleanEmail);
        set({ isMaster });
        
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
          try {
            let userData: any = null;
            let mappedCompanies: Company[] = [];

            if (sb) {
              // 1. Get/Sync Supabase User Profile
              const { data: userDataSnap, error: profileErr } = await sb
                .from('users')
                .select('*')
                .eq('firebase_uid', firebaseUser.uid)
                .maybeSingle();
              
              userData = userDataSnap;

              if (!userData && !profileErr) {
                const { data: emailData } = await sb.from('users').select('*').eq('email', cleanEmail).maybeSingle();
                userData = emailData;
                if (userData && !userData.firebase_uid) {
                  await sb.from('users').update({ firebase_uid: firebaseUser.uid, updated_at: new Date().toISOString() }).eq('id', userData.id);
                }
              }

              if (!userData && !profileErr) {
                const { data: newProfile } = await sb.from('users').insert({
                  email: cleanEmail,
                  firebase_uid: firebaseUser.uid,
                  fullname: firebaseUser.displayName || cleanEmail.split('@')[0],
                  avatar_url: firebaseUser.photoURL
                }).select().single();
                userData = newProfile;
              }
              
              set({ profileLoaded: true });

              if (isMaster) {
                // MASTER BYPASS: Fetch ALL companies
                const { data: allCompanies, error: allErr } = await sb
                  .from('companies')
                  .select('*');
                
                if (!allErr && allCompanies) {
                  mappedCompanies = allCompanies.map((c: any) => ({
                    ...c,
                    role: 'OWNER',
                    permissions: ['*'],
                    hierarchy: 100,
                    status: 'active'
                  }));
                  
                  // --- AUTO-AFFILIATION ENGINE ---
                  // Ensure master is in company_members for all companies natively
                  if (userData?.id) {
                    try {
                       const { data: existingMemberships } = await sb
                         .from('company_members')
                         .select('company_id')
                         .eq('user_id', userData.id);
                       
                       const existingCompanyIds = new Set((existingMemberships || []).map(m => m.company_id));
                       const missingCompanies = allCompanies.filter(c => !existingCompanyIds.has(c.id));
                       
                       if (missingCompanies.length > 0) {
                         const { data: sysRole } = await sb.from('roles').select('id').eq('name', 'owner').maybeSingle();
                         const memberInserts = missingCompanies.map(c => ({
                           user_id: userData.id,
                           company_id: c.id,
                           role_id: sysRole?.id, // Optional, could be null
                           status: 'active',
                           permissions: ['*']
                         }));
                         
                         await sb.from('company_members').insert(memberInserts);
                         console.log(`[Nexus Sync] Auto-affiliated master admin to ${missingCompanies.length} organizations.`);
                       }
                    } catch (syncErr) {
                       console.warn("[Nexus Sync] Auto-affiliation warning:", syncErr);
                    }
                  }
                }
              } else {
                // 2. Fetch Relational Affiliations (Supabase company_members)
                const { data: memberships, error: memError } = await sb
                  .from('company_members')
                  .select(`
                    id,
                    status,
                    permissions,
                    roles (name, hierarchy_level),
                    companies (*)
                  `)
                  .eq('user_id', userData?.id)
                  .eq('status', 'active');

                if (!memError && memberships) {
                  mappedCompanies = memberships.map((m: any) => ({
                    ...m.companies,
                    role: m.roles?.name || 'Personnel',
                    permissions: m.permissions || [],
                    hierarchy: m.roles?.hierarchy_level,
                    status: m.status
                  }));
                }
              }
            } else {
              // FIREBASE FALLBACK ENGINE
              console.log("Nexus Store: Using Firestore fallback engine.");
              
              // 1. Get/Sync User Profile in Firestore
              const userRef = query(collection(db, 'users'), where('uid', '==', firebaseUser.uid));
              const userSnap = await getDocs(userRef);
              
              if (!userSnap.empty) {
                userData = userSnap.docs[0].data();
                userData.id = userSnap.docs[0].id;
              }
              
              set({ profileLoaded: true });

              if (isMaster) {
                 const companiesSnap = await getDocs(collection(db, 'companies'));
                 mappedCompanies = companiesSnap.docs.map(d => ({
                   ...d.data(),
                   id: d.id,
                   role: 'OWNER',
                   permissions: ['*']
                 })) as any;
                 
                 // --- AUTO-AFFILIATION ENGINE (FIRESTORE) ---
                 try {
                   for (const c of mappedCompanies) {
                      const personnelRef = query(collection(db, 'personnel'), where('email', '==', cleanEmail), where('companyId', '==', c.id));
                      const personnelSnap = await getDocs(personnelRef);
                      if (personnelSnap.empty) {
                        try {
                           const { addDoc } = await import('firebase/firestore');
                           await addDoc(collection(db, 'personnel'), {
                              companyId: c.id,
                              email: cleanEmail,
                              role: 'OWNER',
                              name: userData?.fullname || cleanEmail.split('@')[0],
                              status: 'active'
                           });
                        } catch (e) {}
                      }
                   }
                 } catch (syncErr) {
                    console.warn("[Nexus Sync] Firestore auto-affiliation warning:", syncErr);
                 }
              } else {
                // 2. Fetch Memberships from 'personnel'
                const personnelRef = query(collection(db, 'personnel'), where('email', '==', cleanEmail));
                const personnelSnap = await getDocs(personnelRef);
                
                if (!personnelSnap.empty) {
                  const companyIds = personnelSnap.docs.map(d => d.data().companyId);
                  const roleMap = new Map();
                  personnelSnap.docs.forEach(d => roleMap.set(d.data().companyId, d.data().role));

                  // 3. Fetch Company Details
                  const companiesPromises = companyIds.map(id => getDocs(query(collection(db, 'companies'), where('id', '==', id))).catch(() => null));
                  const companiesSnaps = await Promise.all(companiesPromises);

                  mappedCompanies = companiesSnaps
                    .filter(s => s && !s.empty)
                    .map((s: any) => {
                      const data = s.docs[0].data();
                      return {
                        id: data.id || s.docs[0].id,
                        name: data.name,
                        role: roleMap.get(data.id || s.docs[0].id) || 'Personnel'
                      };
                    });
                }
              }
            }

            // 3. Metadata Enrichment (Firestore - Real-time metadata)
            try {
               if (mappedCompanies.length > 0) {
                  const ids = mappedCompanies.map(c => c.id);
                  const metaPromises = ids.map(id => getDocs(query(collection(db, 'companies'), where('id', '==', id))).catch(() => null));
                  const metaSnaps = await Promise.all(metaPromises);
                  
                  mappedCompanies = mappedCompanies.map((c, i) => {
                    const snap = metaSnaps[i];
                    if (snap && !snap.empty) {
                      const data = snap.docs[0].data();
                      return {
                        ...c,
                        whatsappNumber: data.whatsappNumber,
                        nairaRate: data.nairaRate,
                        categories: data.categories
                      };
                    }
                    return c;
                  });
               }
            } catch(e) {
               console.warn("Nexus Store: Metadata enrichment skip", e);
            }

            if (isMaster) {
              set({ userProfile: { ...userData, role: 'owner', isMaster: true } });
            } else {
              set({ userProfile: userData });
            }

            set({ 
              companies: mappedCompanies, 
              companiesLoaded: true,
              initialized: true 
            });

            // 4. Session Recovery Strategy
            const savedId = localStorage.getItem('nexus_company_id');
            const lastId = localStorage.getItem('nexus_last_company_id');
            const dbId = userData?.current_company_id;
            
            // Priority: Explicit Local > Database Sync > Last Local > First Available
            const targetId = savedId || dbId || lastId;
            
            if (targetId) {
              const found = mappedCompanies.find(c => c.id === targetId);
              if (found) {
                set({ currentCompany: found });
                localStorage.setItem('nexus_company_id', found.id);
                localStorage.setItem('nexus_last_company_id', found.id);
              } else if (mappedCompanies.length > 0) {
                set({ currentCompany: mappedCompanies[0] });
                localStorage.setItem('nexus_company_id', mappedCompanies[0].id);
              }
            } else if (mappedCompanies.length > 0) {
              set({ currentCompany: mappedCompanies[0] });
              localStorage.setItem('nexus_company_id', mappedCompanies[0].id);
            }

            break; // Success! Exit retry loop
          } catch (err) {
            attempts++;
            console.warn(`Nexus Recovery: Attempt ${attempts} failed.`, err);
            if (attempts >= maxAttempts) {
               console.error("Nexus Recovery: Max retries reached. System in degraded mode.");
               set({ companiesLoaded: true, initialized: true }); // Prevent infinite spinners on crash
            } else {
               await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Backoff
            }
          }
        }
        
        set({ loading: false });
      },

      initNexus: async () => {
        const state = get();
        if (state.initialized && auth.currentUser) return;
        await state.refreshAffiliations();
      }
    }),
    {
      name: 'nexus-erp-session',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        currentCompany: state.currentCompany,
        companies: state.companies,
        userProfile: state.userProfile
      }),
    }
  )
);
