import { getSupabase } from '../../lib/supabase';

export const tenantApi = {
  async fetchMemberships(userId: string) {
    const sb = getSupabase();
    if (!sb) return [];

    const { data: memberships } = await sb
      .from('company_members')
      .select(`
        id,
        company_id,
        status,
        roles (name, hierarchy_level),
        companies (*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active');
      
    return memberships || [];
  },

  async fetchAllCompaniesForGlobalAdmin(limit: number = 20) {
    const sb = getSupabase();
    if (!sb) return [];

    const { data: companies } = await sb.from('companies').select('*').order('created_at', { ascending: false }).limit(limit);
    if (!companies) return [];

    return companies.map(c => ({
      id: `auto-gen-${c.id}`,
      company_id: c.id,
      status: 'active',
      roles: { name: 'global_admin', hierarchy_level: 100 },
      companies: c
    }));
  }
};
