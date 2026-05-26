import { DriftSeverity } from './ConsistencyTypes';

export enum PolicyAction {
  NONE = 'NONE',
  SILENT_REFRESH = 'SILENT_REFRESH',
  REHYDRATE_AND_RESET = 'REHYDRATE_AND_RESET',
  FREEZE_AND_RECOVER = 'FREEZE_AND_RECOVER'
}

export class ConsistencyPolicyEngine {
  static determineAction(severity: DriftSeverity): PolicyAction {
    switch (severity) {
      case DriftSeverity.CRITICAL_DRIFT:
        // tenant mismatch, violation multi-tenant -> freeze UI + full recovery bootstrap
        return PolicyAction.FREEZE_AND_RECOVER;
      
      case DriftSeverity.MEDIUM_DRIFT:
        // permission mismatch, workspace incohérent -> rehydration + reset listeners
        return PolicyAction.REHYDRATE_AND_RESET;
        
      case DriftSeverity.MINOR_DRIFT:
        // cache obsolète, listener delay -> silent refresh
        return PolicyAction.SILENT_REFRESH;

      case DriftSeverity.NO_DRIFT:
      default:
        return PolicyAction.NONE;
    }
  }
}
