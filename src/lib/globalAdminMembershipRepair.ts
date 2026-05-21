import { isImmutableSuperAdmin } from './permissionIntegrityChecker';

export async function repairGlobalAdminMemberships(sb: any, profile: any, cleanEmail: string) {
    if (!profile || !cleanEmail || !isImmutableSuperAdmin(cleanEmail)) return;

    try {
        console.warn("[Nexus Repair] Global Admin verified. Commencing physical affiliation sync...");
        
        // 1. Get the global_admin role ID
        let { data: globalAdminRole } = await sb.from('roles').select('id').eq('name', 'global_admin').maybeSingle();
        
        if (!globalAdminRole) {
            // Fallback: If global_admin role is missing, we might use OWNER role with high level, but ideally global_admin should exist.
            const { data: ownerRole } = await sb.from('roles').select('id').eq('name', 'OWNER').maybeSingle();
            globalAdminRole = ownerRole;
            if (!globalAdminRole) {
                 console.error("No valid admin role found in DB for physical injection.");
                 return;
            }
        }

        // 2. Fetch all companies
        const { data: allCompanies } = await sb.from('companies').select('id');
        if (!allCompanies || allCompanies.length === 0) return;

        // 3. Fetch existing physical memberships for this profile
        const { data: existingMemberships } = await sb.from('company_members')
            .select('company_id')
            .eq('user_id', profile.id);
            
        const existingCompanyIds = new Set(existingMemberships?.map((m: any) => m.company_id) || []);

        // 4. Determine missing affiliations
        const missingCompanies = allCompanies.filter((c: any) => !existingCompanyIds.has(c.id));
        
        if (missingCompanies.length > 0) {
            console.warn(`[Nexus Repair] Injecting ${missingCompanies.length} physical affiliations...`);
            
            const insertPayload = missingCompanies.map((c: any) => ({
                user_id: profile.id,
                company_id: c.id,
                role_id: globalAdminRole.id,
                status: 'active'
            }));

            const { error: insertError } = await sb.from('company_members').insert(insertPayload);
            if (insertError) {
                 // Try upserting one by one if bulk insert fails due to constraint
                 for (const payload of insertPayload) {
                     await sb.from('company_members').upsert(payload, { onConflict: 'user_id, company_id' });
                 }
            } else {
                console.log("[Nexus Repair] Physical affiliations successfully persisted DB.");
            }
        }
    } catch (e) {
        console.error("[Nexus Repair] Error during physical sync:", e);
    }
}
