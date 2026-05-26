export enum DriftCase {
  CASE_1_MEMBERSHIP_MISSING = 'CASE_1_MEMBERSHIP_MISSING',
  CASE_2_RLS_INVISIBLE = 'CASE_2_RLS_INVISIBLE',
  CASE_3_SAGA_INCOMPLETE = 'CASE_3_SAGA_INCOMPLETE',
  CASE_4_READINESS_INCOHERENT = 'CASE_4_READINESS_INCOHERENT',
  HEALTHY = 'HEALTHY'
}

export interface DiagnosticResult {
  driftCase: DriftCase;
  isHealed: boolean;
  companyId?: string;
  userId?: string;
  details: string;
}
