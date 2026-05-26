/**
 * NetworkStateManager manages the network status tracking across the application.
 * Optimizes event listeners to avoid memory leaks.
 */
export class NetworkStateManager {
  private static isOnline = navigator.onLine;
  private static listeners: Set<(online: boolean) => void> = new Set();
  private static initialized = false;

  static init() {
    if (this.initialized) return;
    this.initialized = true;

    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  private static handleOnline = () => {
    this.isOnline = true;
    this.notify();
  };

  private static handleOffline = () => {
    this.isOnline = false;
    this.notify();
  };

  static subscribe(listener: (online: boolean) => void) {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  static getIsOnline(): boolean {
    return this.isOnline;
  }

  private static notify() {
    this.listeners.forEach((listener) => listener(this.isOnline));
  }
}
