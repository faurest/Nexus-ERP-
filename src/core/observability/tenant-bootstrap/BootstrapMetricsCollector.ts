export class BootstrapMetricsCollector {
  private static timestamps: Map<string, number> = new Map();

  static startTimer(operationKey: string) {
    this.timestamps.set(operationKey, Date.now());
  }

  static stopTimer(operationKey: string): number {
    const start = this.timestamps.get(operationKey);
    if (!start) return 0;
    const latency = Date.now() - start;
    this.timestamps.delete(operationKey);
    return latency;
  }
}
