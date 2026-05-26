import { BootstrapTraceEvent } from './BootstrapTraceTypes';
import { BootstrapTimelineRecorder } from './BootstrapTimelineRecorder';

export const BOOTSTRAP_DEBUG_MODE = true; // Hardcoded for true real-time observability

export class BootstrapEventLogger {
  static async logEvent(event: BootstrapTraceEvent) {
    if (BOOTSTRAP_DEBUG_MODE) {
      console.log(`[BOOTSTRAP TRACE] [${event.layer}] ${event.status} | ${event.stateBefore || 'START'} -> ${event.stateAfter} | Latency: ${event.latency || 0}ms`, event.errorCode || '');
    }
    
    // Async fire and forget to avoid blocking the critical path
    Promise.resolve().then(() => {
      BootstrapTimelineRecorder.record(event);
    });
  }
}
