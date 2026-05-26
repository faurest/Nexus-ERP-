export interface BootstrapContext {
  idempotencyKey: string;
  userId: string;
  userEmail: string;
  companyName: string;
  companyId?: string;
  workspaceId?: string;
  employeesToAssign?: Array<{ email: string; role: string }>;
  retryCount: number;
  lastError?: string;
  offlineQueued?: boolean;
}
