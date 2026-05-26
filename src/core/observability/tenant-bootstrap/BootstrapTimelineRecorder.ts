import { BootstrapTraceEvent } from './BootstrapTraceTypes';
import { BootstrapExecutionStore } from './BootstrapExecutionStore';
import { BootstrapVerdictEngine } from './BootstrapVerdictEngine';
import { BootstrapSessionCorrelator } from './BootstrapSessionCorrelator';

export class BootstrapTimelineRecorder {
  // We keep in-memory cache for fast access, but also sync to Execution Store
  private static events: Map<string, BootstrapTraceEvent[]> = new Map();

  static record(event: BootstrapTraceEvent) {
    const key = event.idempotencyKey;
    if (!this.events.has(key)) {
      this.events.set(key, []);
    }
    this.events.get(key)!.push(event);
    
    // Send to Execution Store as the Source of Truth
    BootstrapExecutionStore.saveEvent(event);
  }

  static getReport(idempotencyKey: string) {
    const timeline = BootstrapSessionCorrelator.getUnifiedTimeline(idempotencyKey);
    const verdictData = BootstrapVerdictEngine.generateVerdict(idempotencyKey);

    return {
      idempotencyKey,
      totalEvents: timeline.length,
      verdict: verdictData.verdict,
      consistency: verdictData.consistency,
      timeline,
      durationTracker: timeline.length > 0 ? timeline[timeline.length - 1].timestamp - timeline[0].timestamp : 0,
      hasErrors: timeline.some(e => e.status === 'FAILED'),
      hasRollback: timeline.some(e => e.status === 'ROLLBACK')
    };
  }
  
  static printExecutionReport(idempotencyKey: string) {
    const report = this.getReport(idempotencyKey);
    console.group(`🧾 BOOTSTRAP_EXECUTION_REPORT: ${idempotencyKey}`);
    console.log(`Verdict: ${report.verdict} | Consistency: ${report.consistency}`);
    console.table(report.timeline, ['layer', 'status', 'stateBefore', 'stateAfter', 'latency', 'errorCode']);
    console.log(`Total Duration: ${report.durationTracker}ms | Errors: ${report.hasErrors} | Rollbacks: ${report.hasRollback}`);
    console.groupEnd();
  }
}
