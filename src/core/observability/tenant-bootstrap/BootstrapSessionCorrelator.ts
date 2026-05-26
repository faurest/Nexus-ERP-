import { BootstrapTraceEvent } from './BootstrapTraceTypes';
import { BootstrapExecutionStore } from './BootstrapExecutionStore';

export class BootstrapSessionCorrelator {
  static getUnifiedTimeline(idempotencyKey: string): BootstrapTraceEvent[] {
    const rawEvents = BootstrapExecutionStore.getEvents(idempotencyKey);
    // Sort by timestamp to ensure chronological order across retries/crashes
    return rawEvents.sort((a, b) => a.timestamp - b.timestamp);
  }

  static hasPreviousCrash(unifiedTimeline: BootstrapTraceEvent[]): boolean {
    if (unifiedTimeline.length === 0) return false;
    // If the timeline has long pauses or repeated states, it indicates a retry/crash
    const states = unifiedTimeline.map(e => e.stateAfter);
    const hasDuplicates = new Set(states).size !== states.length;
    return hasDuplicates;
  }
}
