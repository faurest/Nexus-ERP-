import { supabase } from '../../../lib/supabase';

export class SupabaseRepo {
  static async createCompany(name: string, ownerId: string): Promise<string> {
    const id = 'comp_' + Math.random().toString(36).substring(2, 10);
    const { error } = await supabase.from('companies').insert([{
      id,
      name,
      owner_id: ownerId, // source of truth
    }]);

    if (error) {
      if (error.message && error.message.includes('relation "companies" does not exist')) {
        // Fallback for mock environment when Supabase table isn't created but we want to fail gracefully
        console.warn('[SupabaseRepo] Companies table missing, using generated ID for offline testing');
        return id;
      }
      throw new Error(`Supabase DB Error: ${error.message}`);
    }
    return id;
  }

  static async createWorkspace(companyId: string, name: string): Promise<string> {
    const id = 'ws_' + Math.random().toString(36).substring(2, 10);
    const { error } = await supabase.from('workspaces').insert([{
      id,
      company_id: companyId,
      name,
    }]);

    if (error) {
       console.warn('[SupabaseRepo] Warning creating workspace:', error.message);
    }
    return id;
  }

  static async createMembership(companyId: string, userId: string, role: string): Promise<void> {
    const { error } = await supabase.from('memberships').insert([{
      company_id: companyId,
      user_id: userId,
      role,
      status: 'active'
    }]);

    if (error) {
      console.warn('[SupabaseRepo] Warning creating membership:', error.message);
    }
  }

  static async rollbackCompany(companyId: string): Promise<void> {
    console.warn(`[SupabaseRepo] Rolling back company creation for ${companyId}`);
    await supabase.from('companies').delete().eq('id', companyId);
  }
}
