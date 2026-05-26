import { BootstrapVerdictEngine, BootstrapVerdict } from '../../observability/tenant-bootstrap/BootstrapVerdictEngine';
import { UIState } from './UIState';

export class BootstrapUIStateGate {
  
  static evaluateAccessStatus(idempotencyKey: string): UIState {
    const { verdict } = BootstrapVerdictEngine.generateVerdict(idempotencyKey);
    
    if (verdict === BootstrapVerdict.VERIFIED_SUCCESS) {
      return UIState.FULL_ACCESS;
    } else if (verdict === BootstrapVerdict.RECOVERED_SUCCESS) {
      return UIState.READ_ONLY;
    } else {
      return UIState.LOCKED;
    }
  }

  static async waitForStabilization(idempotencyKey: string, maxWaitMs = 15000): Promise<UIState> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      const state = this.evaluateAccessStatus(idempotencyKey);
      if (state !== UIState.LOCKED) {
        return state;
      }
      // Non-blocking wait before re-evaluating
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Timeout reached, block access
    return UIState.LOCKED;
  }
}
