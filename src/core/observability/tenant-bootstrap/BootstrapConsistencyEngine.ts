import { BootstrapTraceEvent } from './BootstrapTraceTypes';

export enum ConsistencyStatus {
  CONSISTENT = 'CONSISTENT',
  PARTIAL_STATE = 'PARTIAL_STATE',
  INCONSISTENT = 'INCONSISTENT',
  ORPHAN_TENANT = 'ORPHAN_TENANT',
  RECOVERABLE_STATE = 'RECOVERABLE_STATE'
}

export class BootstrapConsistencyEngine {
  static analyze(timeline: BootstrapTraceEvent[]): ConsistencyStatus {
    if (timeline.length === 0) return ConsistencyStatus.INCONSISTENT;

    const hasSupabase = timeline.some(e => e.layer === 'Supabase' && e.status === 'SUCCESS');
    const hasFirebase = timeline.some(e => e.layer === 'Firebase' && e.status === 'SUCCESS');
    const hasRollback = timeline.some(e => e.status === 'ROLLBACK');
    const isCompleted = timeline.some(e => e.stateAfter === 'COMPLETED' && e.status === 'SUCCESS');

    if (isCompleted && hasSupabase && hasFirebase) {
      return ConsistencyStatus.CONSISTENT;
    }

    if (hasSupabase && !hasFirebase && !hasRollback) {
      return ConsistencyStatus.ORPHAN_TENANT;
    }
    
    if (hasRollback) {
      return ConsistencyStatus.RECOVERABLE_STATE;
    }

    return ConsistencyStatus.PARTIAL_STATE;
  }
}
