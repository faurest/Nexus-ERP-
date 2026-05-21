import { getSupabase } from './supabase';
import { IMMUTABLE_SUPER_ADMINS } from './permissionIntegrityChecker';

export async function linkNewCompanyToGlobalAdmins(companyId: string) {
    const sb = getSupabase();
    if (!sb || !companyId) return;

    try {
        console.log(`[Nexus Autolink] Linking new company ${companyId} to global admins...`);

        // 1. Get Global Admin role OR fallback appropriately
        let { data: globalAdminRole } = await sb.from('roles').select('id').eq('name', 'global_admin').maybeSingle();
        if (!globalAdminRole) {
            const { data: fallbackRole } = await sb.from('roles').select('id').eq('name', 'OWNER').maybeSingle();
            globalAdminRole = fallbackRole;
        }

        if (!globalAdminRole) {
             console.error("[Nexus Autolink] Missing valid role for global admins.");
             return;
        }

        // 2. Fetch all global admin profiles based on emails
        const { data: admins } = await sb.from('users')
             .select('id, email')
             .in('email', IMMUTABLE_SUPER_ADMINS);

        if (!admins || admins.length === 0) {
            console.log("[Nexus Autolink] No global admin profiles found in database yet.");
            return;
        }

        // 3. Create payloads
        const payload = admins.map((admin: any) => ({
            user_id: admin.id,
            company_id: companyId,
            role_id: globalAdminRole.id,
            status: 'active'
        }));

        // 4. Upsert members
        const { error } = await sb.from('company_members').upsert(payload, { onConflict: 'user_id, company_id' });
        
        if (error) {
            console.error("[Nexus Autolink] Failed to link global admins:", error);
        } else {
            console.log(`[Nexus Autolink] Successfully linked ${payload.length} global admins to company.`);
        }
    } catch (e) {
        console.error("[Nexus Autolink] Error during linking:", e);
    }
}
