import { BootstrapTraceEvent } from './BootstrapTraceTypes';
import { BootstrapEventLogger } from './BootstrapEventLogger';

export class BootstrapErrorTracker {
  static trackError(params: {
    userId: string,
    tenantId?: string,
    idempotencyKey: string,
    state: string,
    layer: BootstrapTraceEvent['layer'],
    error: Error,
    isRollback?: boolean
  }) {
    const event: BootstrapTraceEvent = {
       eventId: 'err_' + Date.now() + Math.random().toString(36).substring(2,5),
       userId: params.userId,
       tenantId: params.tenantId,
       idempotencyKey: params.idempotencyKey,
       stateAfter: params.state,
       stateBefore: params.state,
       timestamp: Date.now(),
       layer: params.layer,
       status: params.isRollback ? 'ROLLBACK' : 'FAILED',
       errorCode: params.error.message,
       metadata: { name: params.error.name, stack: params.error.stack }
    };
    
    BootstrapEventLogger.logEvent(event);
  }
}
