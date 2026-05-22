import { getSupabase } from '../../lib/supabase';

export const adminApi = {
  async fetchGlobalAdminRole() {
    const sb = getSupabase();
    if (!sb) return null;

    let { data: role } = await sb.from('roles').select('id, name, hierarchy_level').order('hierarchy_level', { ascending: false }).limit(1).maybeSingle();
    
    if (!role) {
      console.info("[Nexus Base] Seeding global_admin role...");
      const { data: newRole } = await sb.from('roles').insert({
        name: 'global_admin',
        description: 'Administrateur Global System',
        hierarchy_level: 100
      }).select('id, name, hierarchy_level').maybeSingle();
      role = newRole;
    }
    return role;
  },

  async injectGlobalAdmin(userId: string, companyId: string, roleId: string) {
    const sb = getSupabase();
    if (!sb) return;

    await sb.from('company_members').upsert({
      user_id: userId,
      company_id: companyId,
      role_id: roleId,
      status: 'active'
    });
  }
};
