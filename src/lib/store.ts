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
  loading: boolean;
  initialized: boolean;
  
  // Actions
  setCurrentCompany: (company: Company | null) => Promise<void>;
  setCompanies: (companies: Company[]) => void;
  setLoading: (loading: boolean) => void;
  
  // Recovery Engine
  initNexus: () => Promise<void>;
  refreshAffiliations: () => Promise<void>;
  clearSession: () => void;
}

export const useNexusStore = create<NexusState>()(
  persist(
    (set, get) => ({
      currentCompany: null,
      companies: [],
      userProfile: null,
      loading: false,
      initialized: false,

      setLoading: (loading) => set({ loading }),
      setCompanies: (companies) => set({ companies }),

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
        
        set({ loading: true });
        const cleanEmail = firebaseUser.email?.trim().toLowerCase().replace(/\s+/g, '') || '';
        const sb = getSupabase();
        
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
          try {
            if (!sb) {
              console.warn("Nexus Recovery: Supabase unavailable. Falling back to Firestore for affiliations.");
              const q = query(collection(db, 'companies'), where('ownerEmail', '==', cleanEmail));
              const snaps = await getDocs(q);
              const fallbackCompanies: Company[] = [];
              snaps.forEach(doc => {
                fallbackCompanies.push({ id: doc.id, ...doc.data(), role: 'Owner', status: 'active', permissions: ['all'] } as Company);
              });
              
              set({ 
                companies: fallbackCompanies,
                userProfile: { email: cleanEmail, firebase_uid: firebaseUser.uid },
                initialized: true,
              });
              
              if (fallbackCompanies.length > 0) {
                 set({ currentCompany: fallbackCompanies[0] });
                 localStorage.setItem('nexus_company_id', fallbackCompanies[0].id);
              }
              break;
            }

            // 1. Get/Sync Supabase User Profile
            const { data: userDataSnap, error: profileErr } = await sb
              .from('users')
              .select('*')
              .eq('firebase_uid', firebaseUser.uid)
              .maybeSingle();
            
            let userData = userDataSnap;

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

            if (memError) throw memError;

            let mappedCompanies: Company[] = [];
            if (memberships) {
              mappedCompanies = memberships.map((m: any) => ({
                ...m.companies,
                role: m.roles?.name || 'Personnel',
                permissions: m.permissions || [],
                hierarchy: m.roles?.hierarchy_level,
                status: m.status
              }));
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

            set({ 
              companies: mappedCompanies, 
              userProfile: userData,
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
