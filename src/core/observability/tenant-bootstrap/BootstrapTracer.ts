import { BootstrapEventLogger } from './BootstrapEventLogger';
import { BootstrapMetricsCollector } from './BootstrapMetricsCollector';
import { BootstrapErrorTracker } from './BootstrapErrorTracker';
import { BootstrapTimelineRecorder } from './BootstrapTimelineRecorder';
import { BootstrapTraceEvent } from './BootstrapTraceTypes';

export class BootstrapTracer {
  static traceTransition(params: {
    userId: string;
    tenantId?: string;
    idempotencyKey: string;
    stateBefore?: string;
    stateAfter: string;
    layer: BootstrapTraceEvent['layer'];
    status: BootstrapTraceEvent['status'];
    operationKey?: string; // used to calculate latency
  }) {
    let latency = 0;
    if (params.operationKey) {
      latency = BootstrapMetricsCollector.stopTimer(params.operationKey);
    }
    
    BootstrapEventLogger.logEvent({
      eventId: 'evt_' + Date.now() + Math.random().toString(36).substring(2,5),
      userId: params.userId,
      tenantId: params.tenantId,
      idempotencyKey: params.idempotencyKey,
      stateBefore: params.stateBefore,
      stateAfter: params.stateAfter,
      timestamp: Date.now(),
      layer: params.layer,
      status: params.status,
      latency
    });
  }

  static startOperation(operationKey: string) {
     BootstrapMetricsCollector.startTimer(operationKey);
  }
  
  static trackError = BootstrapErrorTracker.trackError;
  static generateReport = BootstrapTimelineRecorder.printExecutionReport;
  static getRawReport = BootstrapTimelineRecorder.getReport;
}
