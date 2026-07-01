import { Logger } from '../../logging/Logger';

export class AuditService {
  private static instance: AuditService;
  private logger = Logger.getInstance();

  private constructor() {}

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  public logAction(action: string, userId: string, companyId: string, resourceId?: string, details?: any) {
    const auditRecord = {
      timestamp: new Date(),
      action,
      userId,
      companyId,
      resourceId,
      details,
    };
    
    // In production, this would persist to an immutable audit ledger
    this.logger.audit(action, userId, companyId, { resourceId, details });
  }
}
