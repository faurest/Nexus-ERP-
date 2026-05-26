import { supabase } from '../../../lib/supabase';

export class SupabaseBootstrapRepo {
  /**
   * Idempotent company creation logic.
   * Supabase expects idempotent constraints if possible, but we'll try to find an existing company by idempotency key.
   */
  static async createCompanyIdempotent(name: string, ownerId: string, idempotencyKey: string): Promise<string> {
    // Note: Assuming idempotency_key is either a column in the database or we use a deterministic ID based on it.
    // For this scope, without changing schema, we will generate a determinist ID or query by idempotency if supported.
    // Since we can't alter schema safely here, we will create a hash from the idempotencyKey to use as ID.
    // Quick crypto/hash polyfill-like behavior to ensure idempotency.
    
    // Instead of real hashing, we'll prefix and format the ID safely.
    const safeKey = idempotencyKey.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
    const id = `comp_${safeKey}_${Date.now().toString(36)}`; // If we want to guarantee idempotency, we just use comp_${safeKey}. Let's use exactly that.
    const deterministicId = `comp_${safeKey}`;

    // Try to find if it exists (idempotency check)
    const { data: existing } = await supabase.from('companies').select('id').eq('id', deterministicId).maybeSingle();
    if (existing) {
      console.log(`[SupabaseBootstrapRepo] Idempotency match found for company: ${deterministicId}`);
      return existing.id;
    }

    const { error } = await supabase.from('companies').insert([{
      id: deterministicId,
      name,
      owner_id: ownerId,
    }]);

    if (error) {
      throw new Error(`[SupabaseBootstrapRepo] DB Error creating company: ${error.message}`);
    }
    
    return deterministicId;
  }

  static async createWorkspaceIdempotent(companyId: string, name: string): Promise<string> {
    const deterministicId = `ws_main_${companyId}`;
    
    const { data: existing } = await supabase.from('workspaces').select('id').eq('id', deterministicId).maybeSingle();
    if (existing) {
       return existing.id;
    }

    const { error } = await supabase.from('workspaces').insert([{
      id: deterministicId,
      company_id: companyId,
      name,
    }]);

    if (error) {
      throw new Error(`[SupabaseBootstrapRepo] DB Error creating workspace: ${error.message}`);
    }
    return deterministicId;
  }

  static async createMembershipIdempotent(companyId: string, userId: string, role: string = 'owner'): Promise<void> {
    // Upsert membership
    const { error } = await supabase.from('memberships').upsert({
      company_id: companyId,
      user_id: userId,
      role: role,
      status: 'active'
    }, { onConflict: 'company_id,user_id' }); // Assuming unique constraint exists

    if (error && !error.message.includes('duplicate key')) { // Ignore explicit duplicates as idempotency 
       console.warn(`[SupabaseBootstrapRepo] Error creating membership (may already exist): ${error.message}`);
    }
  }

  static async createMembershipByEmailIdempotent(companyId: string, userEmail: string, role: string): Promise<void> {
    // Look up user by email
    const { data: user } = await supabase.from('users').select('id').eq('email', userEmail).maybeSingle();
    let userId = user?.id;
    
    if (!userId) {
       // If user does not exist, we might create a placeholder user or simply use email as ID placeholder for invitations.
       // In Nexus ERP, we will insert them into users table if they don't exist.
       const newUserId = `usr_${userEmail.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10)}_${Date.now().toString(36)}`;
       const { error: insertError } = await supabase.from('users').insert({ id: newUserId, email: userEmail, first_name: 'Invited User' });
       if (insertError) {
          console.warn(`[SupabaseBootstrapRepo] Could not create placeholder user for ${userEmail}: ${insertError.message}`);
          return;
       }
       userId = newUserId;
    }
    
    await this.createMembershipIdempotent(companyId, userId, role);
  }

  static async rollbackCompany(companyId: string): Promise<void> {
    console.warn(`[SupabaseBootstrapRepo] ROLLBACK: Deleting company ${companyId} due to partial failure`);
    await supabase.from('companies').delete().eq('id', companyId);
  }
}
