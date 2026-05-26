import { BootstrapConsistencyEngine, ConsistencyStatus } from './BootstrapConsistencyEngine';
import { BootstrapSessionCorrelator } from './BootstrapSessionCorrelator';

export enum BootstrapVerdict {
  VERIFIED_SUCCESS = 'VERIFIED_SUCCESS',
  RECOVERED_SUCCESS = 'RECOVERED_SUCCESS',
  PARTIAL_FAILURE = 'PARTIAL_FAILURE',
  DATA_INCONSISTENCY = 'DATA_INCONSISTENCY',
  ROLLBACK_REQUIRED = 'ROLLBACK_REQUIRED',
  UNKNOWN_STATE = 'UNKNOWN_STATE'
}

export class BootstrapVerdictEngine {
  static generateVerdict(idempotencyKey: string): { verdict: BootstrapVerdict, consistency: ConsistencyStatus } {
    const timeline = BootstrapSessionCorrelator.getUnifiedTimeline(idempotencyKey);
    const consistency = BootstrapConsistencyEngine.analyze(timeline);
    const hasCrash = BootstrapSessionCorrelator.hasPreviousCrash(timeline);

    let verdict = BootstrapVerdict.UNKNOWN_STATE;

    switch(consistency) {
      case ConsistencyStatus.CONSISTENT:
        verdict = hasCrash ? BootstrapVerdict.RECOVERED_SUCCESS : BootstrapVerdict.VERIFIED_SUCCESS;
        break;
      case ConsistencyStatus.ORPHAN_TENANT:
        verdict = BootstrapVerdict.ROLLBACK_REQUIRED;
        break;
      case ConsistencyStatus.RECOVERABLE_STATE:
        verdict = BootstrapVerdict.PARTIAL_FAILURE;
        break;
      case ConsistencyStatus.PARTIAL_STATE:
        verdict = BootstrapVerdict.PARTIAL_FAILURE;
        break;
      case ConsistencyStatus.INCONSISTENT:
        verdict = BootstrapVerdict.DATA_INCONSISTENCY;
        break;
    }

    return { verdict, consistency };
  }
}
