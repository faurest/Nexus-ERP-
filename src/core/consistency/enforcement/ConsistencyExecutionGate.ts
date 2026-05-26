import { DriftSeverity } from '../ConsistencyTypes';
import { ConsistencyExecutionState } from './ConsistencyExecutionState';

export class ConsistencyExecutionGate {
  private static currentState: ConsistencyExecutionState = ConsistencyExecutionState.ALLOW;

  static evaluateStateForDrift(severity: DriftSeverity): ConsistencyExecutionState {
    switch (severity) {
      case DriftSeverity.CRITICAL_DRIFT:
        return ConsistencyExecutionState.HARD_BLOCK;
      case DriftSeverity.MEDIUM_DRIFT:
        return ConsistencyExecutionState.SOFT_BLOCK;
      case DriftSeverity.MINOR_DRIFT:
      case DriftSeverity.NO_DRIFT:
      default:
        return ConsistencyExecutionState.ALLOW;
    }
  }

  static lock(severity: DriftSeverity) {
    this.currentState = this.evaluateStateForDrift(severity);
    console.log(`[ConsistencyExecutionGate] Gate Locked at level: ${this.currentState}`);
  }

  static unlock() {
    this.currentState = ConsistencyExecutionState.ALLOW;
    console.log(`[ConsistencyExecutionGate] Gate Unlocked. Normal operations resumed.`);
  }

  static getState(): ConsistencyExecutionState {
    return this.currentState;
  }
}
