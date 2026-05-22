import { getSupabase } from './supabase';

export async function linkNewCompanyToGlobalAdmins(companyId: string) {
    const sb = getSupabase();
    if (!sb || !companyId) return;

    try {
        console.log(`[Nexus Autolink] Linking new company ${companyId} to global admins...`);

        // 1. Get Global Admin role OR fallback appropriately
        let { data: globalAdminRole } = await sb.from('roles').select('id, name, hierarchy_level').order('hierarchy_level', { ascending: false }).limit(1).maybeSingle();

        if (!globalAdminRole) {
             console.info("[Nexus Autolink] Missing valid role for global admins. Attempting to seed...");
             const { data: newRole, error: insertError } = await sb.from('roles').insert({
                 name: 'global_admin',
                 description: 'Administrateur Global System',
                 hierarchy_level: 100
             }).select('id, name, hierarchy_level').maybeSingle();

             if (insertError || !newRole) {
                 console.warn("[Nexus Autolink] Failed to seed global_admin role:", insertError?.message || "Unknown error");
                 return;
             }
             globalAdminRole = newRole;
        }

        // 2. Fetch all global admin profiles based on emails from global_admins table
        const { data: globalAdminsRaw } = await sb.from('global_admins').select('email');
        const adminEmails = globalAdminsRaw?.map((row: any) => row.email) || [
             'hackeurfaurest@gmail.com',
             'dangafelicite@gmail.com',
             'yaoubaboubakary43@gmail.com'
        ];

        const { data: admins } = await sb.from('users')
             .select('id, email')
             .in('email', adminEmails);

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
