import { BootstrapTraceEvent } from './BootstrapTraceTypes';

export class BootstrapExecutionStore {
  private static STORAGE_KEY = 'NEXUS_BOOTSTRAP_EXEC_STORE';

  static saveEvent(event: BootstrapTraceEvent) {
    try {
      const store = this.getStore();
      if (!store[event.idempotencyKey]) {
        store[event.idempotencyKey] = [];
      }
      store[event.idempotencyKey].push(event);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
      console.warn('[BootstrapExecutionStore] Could not persist event to Execution Store', e);
    }
  }

  static getEvents(idempotencyKey: string): BootstrapTraceEvent[] {
    const store = this.getStore();
    return store[idempotencyKey] || [];
  }

  private static getStore(): Record<string, BootstrapTraceEvent[]> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }
}
