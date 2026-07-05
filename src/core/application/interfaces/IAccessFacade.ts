import { AccessResult } from '../usecases/access/AccessUseCases';

export interface IAccessFacade {
  observeAccess(userId: string, companyId: string, callback: (access: AccessResult | null) => void, email?: string): () => void;
  autoEnrollMember(userId: string, companyId: string, email: string, displayName?: string): Promise<boolean>;
  validateWhitelist(email: string, userId: string, companiesCount: number, isMaster: boolean): Promise<boolean>;
}
