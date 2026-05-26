import { ConsistencyExecutionGate } from './ConsistencyExecutionGate';
import { ConsistencyExecutionState } from './ConsistencyExecutionState';

export class RuntimeConsistencyFence {
  static isActionAllowed(actionType: 'MUTATION' | 'NAVIGATION' | 'READ'): boolean {
    const state = ConsistencyExecutionGate.getState();

    if (state === ConsistencyExecutionState.HARD_BLOCK) {
      // Complete freeze. Nothing is allowed.
      return false;
    }

    if (state === ConsistencyExecutionState.SOFT_BLOCK) {
      // Partial freeze. Allow reads, but block critical mutations and navigations.
      if (actionType === 'MUTATION' || actionType === 'NAVIGATION') {
        return false;
      }
    }

    return true; // ALLOW state
  }

  static assertActionAllowed(actionType: 'MUTATION' | 'NAVIGATION' | 'READ', contextInfo: string) {
    if (!this.isActionAllowed(actionType)) {
      console.error(`[RuntimeConsistencyFence] Action BLOCKED (${actionType}): ${contextInfo}. System is currently resolving consistency drift.`);
      throw new Error('SYSTEM_FROZEN_FOR_RECONCILIATION');
    }
  }
}
