import { isGlobalAdminAsync } from './permissionIntegrityChecker';
import { getSupabase } from './supabase';

export async function repairGlobalAdminMemberships(sb: any, profile: any, cleanEmail: string) {
    if (!profile || !cleanEmail || !(await isGlobalAdminAsync(cleanEmail))) return;

    try {
        console.warn('[Nexus Repair] Global Admin verified. Skipping legacy physical affiliation sync to support PAGINATED ENTERPRISE LOADING.');
        // LEGACY behavior disabled. Global Admin relies on RLS functions `is_global_admin()` to bypass `company_members` checks.
        // We no longer physically seed every company membership to prevent WebView/RAM explosion on mobile.
    } catch (e) {
        console.error('[Nexus Repair] Failed to verify global admin', e);
    }
}
