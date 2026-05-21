import { auth, onAuthStateChanged } from '../lib/firebase';
import { getSupabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { isImmutableSuperAdmin } from '../lib/permissionIntegrityChecker';

export class NexusRecoveryEngine {
  private static isRecovering = false;

  static async init() {
    onAuthStateChanged(auth, async (firebaseUser) => {
      const store = useAuthStore.getState();
      
      if (!firebaseUser) {
        store.clearSession();
        return;
      }

      // 1. Setup minimal user payload
      store.setUser(firebaseUser);
      
      // 2. Launch Background Sync
      await this.synchronizeIdentity(firebaseUser);
    });
  }

  private static async synchronizeIdentity(user: any) {
    if (this.isRecovering) return;
    this.isRecovering = true;

    const store = useAuthStore.getState();
    const sb = getSupabase();
    if (!sb) {
        this.isRecovering = false;
        return;
    }

    const cleanEmail = user.email?.trim().toLowerCase().replace(/\s+/g, '') || '';
    
    try {
      // 1. Resolve Profile in Supabase
      let { data: profile, error: pError } = await sb
        .from('users')
        .select('*')
        .eq('firebase_uid', user.uid)
        .maybeSingle();

      if (!profile && cleanEmail) {
        // Fallback: search by email
        const { data: emailProfile } = await sb
          .from('users')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();
          
        if (emailProfile) {
          profile = emailProfile;
          // Auto-repair firebase_uid linkage
          await sb.from('users').update({ firebase_uid: user.uid }).eq('id', profile.id);
        } else {
          // Auto-create profile if missing
          const { data: newProfile, error: insertError } = await sb
            .from('users')
            .insert({
               email: cleanEmail,
               firebase_uid: user.uid,
               fullname: user.displayName || 'Utilisateur',
               is_active: true
            })
            .select('*')
            .single();
            
          if (!insertError) profile = newProfile;
        }
      }

      if (profile) {
        store.setProfile(profile);

        // 2. Resolve Memberships from Source of Truth (company_members)
        let { data: memberships } = await sb
          .from('company_members')
          .select(`
            id,
            company_id,
            status,
            roles (name, hierarchy_level),
            companies (*)
          `)
          .eq('user_id', profile.id)
          .eq('status', 'active');

        // Fix global admin missing memberships
        const hasGlobalRights = store.isGlobalAdmin || isImmutableSuperAdmin(user.email);
        if (hasGlobalRights) {
           console.warn("[Nexus Recovery] Global Admin without local memberships detected. Fetching all available instances...");
           const { data: allCompanies } = await sb.from('companies').select('*');
           
           if (allCompanies) {
             const adminMemberships = allCompanies.map(c => ({
                id: `auto-gen-${c.id}`,
                company_id: c.id,
                status: 'active',
                roles: { name: 'global_admin', hierarchy_level: 100 },
                companies: c
             }));
             memberships = adminMemberships;
           }
        }
        
        // 3. Fallback: If no memberships but in Firestore (Legacy handling left for CompanyContext for now or can do it here)
        
        if (memberships) {
            store.setMemberships(memberships);
            
            // Validate workspace selection validity
            if (store.currentCompanyId) {
                const isValid = memberships.some(m => m.company_id === store.currentCompanyId) || store.isGlobalAdmin;
                if (!isValid) {
                    store.setCurrentCompany(null); // Invalid workspace
                }
            } else if (memberships.length > 0) {
               // Auto select
               store.setCurrentCompany(memberships[0].company_id);
            }
        }
      }
    } catch (e) {
      console.error("[Nexus Recovery] Critical Sync Error:", e);
    } finally {
      this.isRecovering = false;
    }
  }

  // Callable to manually force sync
  static forceSync() {
      const user = auth.currentUser;
      if (user) this.synchronizeIdentity(user);
  }
}
