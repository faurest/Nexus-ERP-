import { supabase } from '../../../lib/supabase';
import { SupabaseBootstrapRepo } from '../tenant-bootstrap/infrastructure/SupabaseBootstrapRepo';
import { SupabaseReadinessChecker } from '../tenant-bootstrap/infrastructure/SupabaseReadinessChecker';
import { DriftCase, DiagnosticResult } from './DiagnosticTypes';
import { SagaStateVerifier } from './SagaStateVerifier';
import { RLSVisibilityTester } from './RLSVisibilityTester';
import { ReadinessReconciler } from './ReadinessReconciler';

export class AccessRepairEngine {
  
  static async diagnoseAndHealUser(email: string, targetCompany: string): Promise<DiagnosticResult> {
    console.log(`[AccessRepairEngine] Executing High-Privilege Diagnostics for ${email}`);
    
    const result: DiagnosticResult = {
      driftCase: DriftCase.HEALTHY,
      isHealed: false,
      details: ''
    };

    try {
      // 1. Resolve Company
      const { data: company, error: companyErr } = await supabase.from('companies').select('id').eq('name', targetCompany).maybeSingle();
      if (companyErr || !company) {
         result.details = `Company ${targetCompany} does not exist. DB Error: ${companyErr?.message}`;
         return result;
      }
      result.companyId = company.id;
      const companyId = company.id;

      // 2. Resolve User
      const { data: user } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
      let userId = user?.id;

      // 3. Diagnose SAGA & Membership
      const isSagaComplete = await SagaStateVerifier.isEmployeeAssignmentComplete(companyId, email);
      
      if (!isSagaComplete) {
         console.warn(`[AccessRepairEngine] CAS 3: SAGA_INCOMPLETE. Missing partial linkage.`);
         result.driftCase = DriftCase.CASE_3_SAGA_INCOMPLETE;
         
         // Auto-Heal: Re-run ASSIGN_EMPLOYEE idempotently
         console.log(`[AccessRepairEngine] HEALING CAS 3... (Re-running Employee Saga Steps)`);
         await SupabaseBootstrapRepo.createMembershipByEmailIdempotent(companyId, email, 'employee');
         
         // Fetch new user ID if we just created them
         const { data: newUser } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
         userId = newUser?.id;
         result.userId = userId;
         result.isHealed = true;
      } else {
         result.userId = userId;
      }

      // Check actual membership status 
      const { data: mem } = await supabase.from('memberships').select('status').eq('company_id', companyId).eq('user_id', userId).maybeSingle();
      
      if (!mem) {
         // Should be impossible if Saga Verification worked, but just in case
         result.driftCase = DriftCase.CASE_1_MEMBERSHIP_MISSING;
         console.warn(`[AccessRepairEngine] CAS 1: MEMBERSHIP_MISSING. Forcing upsert.`);
         await SupabaseBootstrapRepo.createMembershipIdempotent(companyId, userId!, 'employee');
         result.isHealed = true;
      } else if (mem.status !== 'active') {
         console.warn(`[AccessRepairEngine] CAS 2: RLS_INVISIBLE. Status inactive. Updating...`);
         result.driftCase = DriftCase.CASE_2_RLS_INVISIBLE;
         await supabase.from('memberships').update({ status: 'active' }).eq('company_id', companyId).eq('user_id', userId!);
         result.isHealed = true;
      }

      // RLS Check (Diagnostics via client Context)
      const rlsVisible = await RLSVisibilityTester.testVisibility(companyId);
      if (!rlsVisible && result.driftCase === DriftCase.HEALTHY) {
         // Could mean the test failed because token missing or another RLS bug
         result.driftCase = DriftCase.CASE_2_RLS_INVISIBLE;
         result.details = 'RLS blocked the read despite membership claiming to be active. Check auth JWT mapping.';
      }

      // 4. Verify Final Readiness engine (CAS 4)
      const isReady = await SupabaseReadinessChecker.isTenantFullyReady(companyId);
      if (!isReady) {
         console.warn(`[AccessRepairEngine] CAS 4: READINESS_INCOHERENT. SQL returns FALSE.`);
         result.driftCase = DriftCase.CASE_4_READINESS_INCOHERENT;
         result.details = 'Tenant fails master is_tenant_fully_ready check. OWNER might be entirely missing or Company inactive.';
         result.isHealed = false;
      } else {
         // Force Runtime resync if we healed something
         if (result.isHealed) {
            await ReadinessReconciler.reconcile(companyId, userId!);
            result.details = 'Healed and React Runtime Resync Triggered.';
         } else {
            result.isHealed = true;
            result.details = 'System natively healthy.';
         }
      }

      return result;
    } catch (e: any) {
      console.error(`[AccessRepairEngine] Critical exception during diagnostic: ${e.message}`);
      result.details = e.message;
      return result;
    }
  }
}
