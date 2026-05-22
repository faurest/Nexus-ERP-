export class NetworkMonitor {
  static isOnline = navigator.onLine;
  static listeners: ((online: boolean) => void)[] = [];

  static init() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notify();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notify();
    });
  }

  static subscribe(listener: (online: boolean) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private static notify() {
    this.listeners.forEach(l => l(this.isOnline));
  }
}
