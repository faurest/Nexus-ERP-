import { getSupabase } from '../../lib/supabase';

export const permissionsApi = {
  async fetchRolePermissions(roleId: string) {
    const sb = getSupabase();
    if (!sb) return [];

    const { data } = await sb.from('roles').select('permissions').eq('id', roleId).single();
    return data?.permissions || [];
  }
};
