import { SystemState, DriftReport, DriftSeverity } from './ConsistencyTypes';
import { BackendStateComparator } from './BackendStateComparator';

export class ConsistencyDriftDetector {
  static async detectDrift(userId: string, expectedTenantId: string): Promise<DriftReport> {
    const report: DriftReport = {
      severity: DriftSeverity.NO_DRIFT,
      reason: '',
      mismatches: []
    };

    try {
      const truth = await BackendStateComparator.getSupabaseTruth(userId, expectedTenantId);
      const firebaseState = await BackendStateComparator.getFirebaseState(userId, expectedTenantId);
      const frontendState = BackendStateComparator.getFrontendState();

      // 1. Critical Drift: Tenant Mismatch
      if (frontendState.tenantId !== truth.tenantId) {
        report.severity = DriftSeverity.CRITICAL_DRIFT;
        report.reason = 'Tenant Mismatch detected between Frontend and Supabase.';
        report.mismatches.push({
          layer: 'Frontend',
          property: 'tenantId',
          expected: truth.tenantId,
          actual: frontendState.tenantId
        });
        return report; // Return immediately on critical
      }

      // 2. Medium Drift: Permissions or Workspace Mismatch
      const permissionsDrift = JSON.stringify(frontendState.permissions) !== JSON.stringify(truth.permissions);
      const workspaceDrift = frontendState.workspaceId !== truth.workspaceId;

      if (permissionsDrift || workspaceDrift) {
        report.severity = DriftSeverity.MEDIUM_DRIFT;
        report.reason = 'Permissions or Workspace drift detected.';
        if (permissionsDrift) {
           report.mismatches.push({ layer: 'Frontend', property: 'permissions', expected: truth.permissions, actual: frontendState.permissions });
        }
        if (workspaceDrift) {
           report.mismatches.push({ layer: 'Frontend', property: 'workspaceId', expected: truth.workspaceId, actual: frontendState.workspaceId });
        }
        return report;
      }
      
      // 3. Minor Drift: Delay in Firebase Sync
      if (firebaseState.tenantId !== truth.tenantId || JSON.stringify(firebaseState.permissions) !== JSON.stringify(truth.permissions)) {
         report.severity = DriftSeverity.MINOR_DRIFT;
         report.reason = 'Firebase real-time sync is lagging behind Supabase Truth.';
         report.mismatches.push({ layer: 'Firebase', property: 'state', expected: 'sync', actual: 'lag' });
         return report;
      }

      return report;
    } catch (error) {
       console.error('[ConsistencyDriftDetector] Failed to detect drift due to network/system error.', error);
       // Safety fallback: if we can't verify, don't crash, but log it.
       return report;
    }
  }
}
