import { getSupabase } from '../lib/supabase';

export class CompanyRepository {
    static async getMembers(companyId: string) {
        const sb = getSupabase();
        if (!sb) return [];
        const { data } = await sb.from('company_members')
            .select('user_id, status, roles(name)')
            .eq('company_id', companyId);
        return data || [];
    }

    static async linkGlobalAdmins(companyId: string) {
        // ... (This abstracts away linkNewCompanyToGlobalAdmins)
    }
}
