import { supabase } from '../../../lib/supabase';

export class SagaStateVerifier {
  /**
   * Performs an absolute check of SAGA step completion for ASSIGN_EMPLOYEE.
   */
  static async isEmployeeAssignmentComplete(companyId: string, employeeEmail: string): Promise<boolean> {
     // Native SQL check matching the saga component requirements
     const { data: user } = await supabase.from('users').select('id').eq('email', employeeEmail).maybeSingle();
     if (!user) {
        console.warn(`[SagaStateVerifier] User record missing for ${employeeEmail}. SAGA incomplete.`);
        return false;
     }

     const { data: mem } = await supabase.from('memberships')
        .select('role')
        .eq('company_id', companyId)
        .eq('user_id', user.id)
        .eq('role', 'employee')
        .eq('status', 'active')
        .maybeSingle();
     
     if (!mem) return false;

     return true;
  }
}
