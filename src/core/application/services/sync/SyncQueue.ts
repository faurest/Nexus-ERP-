import { Logger } from '../../../logging/Logger';

export interface SyncJob {
  id: string;
  operation: string;
  payload: any;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  retryCount: number;
  createdAt: Date;
}

export class SyncQueue {
  private queue: SyncJob[] = [];
  private logger = Logger.getInstance();

  public enqueue(operation: string, payload: any) {
    const job: SyncJob = {
      id: crypto.randomUUID(),
      operation,
      payload,
      status: 'pending',
      retryCount: 0,
      createdAt: new Date(),
    };
    this.queue.push(job);
    this.logger.sync(`Job enqueued: ${operation}`, { jobId: job.id });
  }

  public getPendingJobs(): SyncJob[] {
    return this.queue.filter(j => j.status === 'pending' || j.status === 'failed');
  }

  public markJobStatus(jobId: string, status: SyncJob['status']) {
    const job = this.queue.find(j => j.id === jobId);
    if (job) {
      job.status = status;
      if (status === 'failed') job.retryCount++;
    }
  }
}
