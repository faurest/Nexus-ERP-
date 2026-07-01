import { Logger } from '../../logging/Logger';

export class SyncService {
  private static instance: SyncService;
  private logger = Logger.getInstance();

  private constructor() {}

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  public async syncDoubleWrite<T>(
    operationName: string,
    primaryTask: () => Promise<T>,
    secondaryTask: () => Promise<void>
  ): Promise<T> {
    try {
      // Execute primary database operation
      const result = await primaryTask();
      
      // Execute secondary database operation in background
      secondaryTask().catch(error => {
        this.logger.error(`[SYNC] Secondary write failed for ${operationName}`, error);
        // Here we could add logic to push to a retry queue (Deferred Sync)
      });

      return result;
    } catch (error) {
      this.logger.error(`[SYNC] Primary write failed for ${operationName}`, error);
      throw error;
    }
  }
}
