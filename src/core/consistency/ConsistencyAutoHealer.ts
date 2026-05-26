import { ConsistencyDriftDetector } from './ConsistencyDriftDetector';
import { ConsistencyPolicyEngine, PolicyAction } from './ConsistencyPolicyEngine';
import { ConsistencyReconciler } from './ConsistencyReconciler';
import { DriftSeverity } from './ConsistencyTypes';
import { ConsistencyExecutionGate } from './enforcement/ConsistencyExecutionGate';

export class ConsistencyAutoHealer {
  /**
   * Evaluates the current drift and smoothly applies non-blocking corrections.
   */
  static async evaluateAndHeal(userId: string, expectedTenantId: string): Promise<void> {
    const report = await ConsistencyDriftDetector.detectDrift(userId, expectedTenantId);
    
    if (report.severity === DriftSeverity.NO_DRIFT) {
      ConsistencyExecutionGate.unlock(); // Ensure system is unblocked
      return; 
    }

    console.warn(`[ConsistencyAutoHealer] Detected ${report.severity}: ${report.reason}`);
    
    // --- Consistency Enforcement Gate Check ---
    ConsistencyExecutionGate.lock(report.severity);
    
    const action = ConsistencyPolicyEngine.determineAction(report.severity);
    
    if (action !== PolicyAction.NONE) {
      const success = await ConsistencyReconciler.applyAction(action, userId, expectedTenantId);
      if (success) {
        console.log(`[ConsistencyAutoHealer] Successfully healed system via ${action}`);
        ConsistencyExecutionGate.unlock(); // Unfreeze system
      } else {
        console.error(`[ConsistencyAutoHealer] Healing failed for action ${action}`);
        // Keep locked if critical, might need manual intervention or a global reload
      }
    } else {
      ConsistencyExecutionGate.unlock();
    }
  }
}
