/**
 * Realtime Orchestrator
 * Central point to coordinate all external realtime DB listeners to avoid duplications.
 * Registers active subscriptions to prevent N+1 leak loops and tenant crossing.
 */

export class RealtimeOrchestrator {
  private static activeListeners: Map<string, () => void> = new Map();

  static subscribe(queryId: string, unsubscribeFn: () => void) {
    // If listener already exists for queryId, clear it before reopening to prevent duplication
    if (this.activeListeners.has(queryId)) {
        console.warn(`[Realtime orchestrator] Duplicate subscription detected for ${queryId}. Replacing...`);
        this.unsubscribe(queryId);
    }
    this.activeListeners.set(queryId, unsubscribeFn);
  }

  static unsubscribe(queryId: string) {
    const fn = this.activeListeners.get(queryId);
    if (fn) {
      fn();
      this.activeListeners.delete(queryId);
    }
  }

  static unsubscribeAll() {
    this.activeListeners.forEach((fn) => fn());
    this.activeListeners.clear();
  }
}
