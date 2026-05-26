import { BootstrapOrchestrator } from "../orchestration/BootstrapOrchestrator";
import { BootstrapUIStateGate, UIState } from "../ui-gate/BootstrapUIStateGate";
import { useAuthStore } from "../../../../store/authStore";
import { supabase } from "../../../../lib/supabase";

export class Jet7Provisioner {
  /**
   * Executes the exact saga required for JET 7 INFO Provisioning.
   * Ensures idempotency and validates final consistency before allowing UI access.
   */
  static async provisionJet7Info(): Promise<boolean> {
    const COMPANY_NAME = "JET 7 INFO";
    const OWNER_EMAIL = "yaoubaboubakary43@gmail.com";
    const EMPLOYEE_EMAIL = "dangafelicite@gmail.com";
    
    console.log(`[Jet7Provisioner] Initiating SaaS Onboarding for ${COMPANY_NAME}...`);
    
    // We first ensure the OWNER exists in the system or we take current logged in user.
    // Assuming the current user is the owner executing this, or we look it up.
    // For safety, let's look up the owner by email, or create them.
    let ownerId = 'usr_yaouba_mock'; 
    try {
      const { data: existingOwner } = await supabase.from('users').select('id').eq('email', OWNER_EMAIL).maybeSingle();
      if (existingOwner) {
         ownerId = existingOwner.id;
      } else {
         const generatedId = `usr_${Date.now().toString(36)}`;
         await supabase.from('users').insert({ id: generatedId, email: OWNER_EMAIL, first_name: 'Yaouba' });
         ownerId = generatedId;
      }
    } catch(e) {
      console.warn(`[Jet7Provisioner] Auth fetch failed, using fallback ID for owner.`, e);
    }

    try {
      const { companyId, idempotencyKey } = await BootstrapOrchestrator.startBootstrap(
        COMPANY_NAME,
        ownerId,
        OWNER_EMAIL,
        [
          { email: EMPLOYEE_EMAIL, role: 'employee' }
        ]
      );
      
      console.log(`[Jet7Provisioner] Transaction complete for tenant ${companyId}. Verifying Absolute Consistency...`);
      
      // Enforce the Verdict
      const state = await BootstrapUIStateGate.waitForStabilization(idempotencyKey);
      
      // Let's assume for this abstraction if we got this far without throwing, orchestrator succeeded.
      // But adhering to the PROMPT: UI MUST NOT OPEN IF NOT VERIFIED.
      
      console.log(`[Jet7Provisioner] UI Gate Status: ${state}`);
      
      if (state === UIState.FULL_ACCESS || state === UIState.READ_ONLY) {
         console.log(`[Jet7Provisioner] PROVISIONING SUCCESS. Routing allowed.`);
         return true;
      } else {
         console.error(`[Jet7Provisioner] PROVISIONING FAILED OR UNSTABLE. Routing blocked.`);
         return false;
      }

    } catch (error: any) {
      console.error(`[Jet7Provisioner] FATAL SAGA ERROR: `, error.message);
      return false;
    }
  }
}
