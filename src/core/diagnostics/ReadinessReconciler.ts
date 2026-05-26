import { SupabaseReadinessChecker } from '../tenant-bootstrap/infrastructure/SupabaseReadinessChecker';
import { ConsistencyAutoHealer } from '../consistency/ConsistencyAutoHealer';

export class ReadinessReconciler {
   /**
    * Forces the consistency engines to recount and align internal state after a backend fix.
    */
   static async reconcile(companyId: string, userId: string) {
       console.log(`[ReadinessReconciler] Reconciling local runtime cache with Backend fixes...`);
       const isReady = await SupabaseReadinessChecker.isTenantFullyReady(companyId);
       
       if (isReady) {
          // Triggers the Watchdog/AutoHealer architecture to unfreeze UI elements
          // and rehydrate missing stores in Zustand or Firebase caches.
          await ConsistencyAutoHealer.evaluateAndHeal(userId, companyId);
       } else {
          console.error(`[ReadinessReconciler] Aborting runtime reconciliation. Supabase SQL reports NOT READY.`);
       }
   }
}
