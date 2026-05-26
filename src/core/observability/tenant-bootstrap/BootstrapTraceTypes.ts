export interface BootstrapTraceEvent {
  eventId: string;
  userId: string;
  tenantId?: string;
  idempotencyKey: string;
  stateBefore?: string;
  stateAfter: string;
  timestamp: number;
  layer: 'UI' | 'Orchestrator' | 'Supabase' | 'Firebase' | 'Runtime' | 'System';
  status: 'SUCCESS' | 'FAILED' | 'RETRY' | 'ROLLBACK' | 'PENDING';
  latency?: number;
  errorCode?: string;
  metadata?: any;
}
