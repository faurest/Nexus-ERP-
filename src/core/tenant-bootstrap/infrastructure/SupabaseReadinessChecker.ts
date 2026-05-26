import { supabase } from '../../../lib/supabase';

export class SupabaseReadinessChecker {
  /**
   * Evaluates the absolute security and structural readiness of a Tenant directly in the database.
   * Checks for OWNER, EMPLOYEE, and valid Company states natively via SQL.
   */
  static async isTenantFullyReady(companyId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_tenant_fully_ready', {
        p_company_id: companyId
      });

      if (error) {
        console.error(`[SupabaseReadinessChecker] Failed to evaluate readiness. SQL Error:`, error.message);
        return false;
      }

      return data === true;
    } catch (e: any) {
      console.error(`[SupabaseReadinessChecker] Network/Critical failure checking readiness:`, e.message);
      return false;
    }
  }
}
