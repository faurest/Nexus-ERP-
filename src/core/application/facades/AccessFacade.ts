import { IAccessFacade } from '../interfaces/IAccessFacade';
import { ObserveAccessUseCase, AutoEnrollMemberUseCase, ValidateWhitelistUseCase, AccessResult } from '../usecases/access/AccessUseCases';

export class AccessFacade implements IAccessFacade {
  constructor(
    private observeAccessUseCase: ObserveAccessUseCase,
    private autoEnrollMemberUseCase: AutoEnrollMemberUseCase,
    private validateWhitelistUseCase: ValidateWhitelistUseCase
  ) {}

  observeAccess(userId: string, companyId: string, callback: (access: AccessResult | null) => void, email?: string): () => void {
    return this.observeAccessUseCase.execute(userId, companyId, callback, email);
  }

  async autoEnrollMember(userId: string, companyId: string, email: string, displayName?: string): Promise<boolean> {
    return this.autoEnrollMemberUseCase.execute(userId, companyId, email, displayName);
  }

  async validateWhitelist(email: string, userId: string, companiesCount: number, isMaster: boolean): Promise<boolean> {
    return this.validateWhitelistUseCase.execute(email, userId, companiesCount, isMaster);
  }
}
