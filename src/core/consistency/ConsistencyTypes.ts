export enum DriftSeverity {
  NO_DRIFT = 'NO_DRIFT',
  MINOR_DRIFT = 'MINOR_DRIFT',
  MEDIUM_DRIFT = 'MEDIUM_DRIFT',
  CRITICAL_DRIFT = 'CRITICAL_DRIFT'
}

export interface SystemState {
  tenantId: string | null;
  permissions: string[];
  workspaceId: string | null;
  lastUpdated: number;
}

export interface DriftReport {
  severity: DriftSeverity;
  reason: string;
  mismatches: {
    layer: 'Frontend' | 'Firebase' | 'Supabase';
    property: string;
    expected: any;
    actual: any;
  }[];
}
