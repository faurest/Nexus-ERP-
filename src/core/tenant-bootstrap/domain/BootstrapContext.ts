export interface BootstrapContext {
  idempotencyKey: string;
  userId: string;
  userEmail: string;
  companyName: string;
  companyId?: string;
  workspaceId?: string;
  retryCount: number;
  lastError?: string;
  offlineQueued?: boolean;
}
