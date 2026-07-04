import { ICompanyRepository } from '../../../domain/repositories/ICompanyRepository';

export class ObserveCompanyUseCase {
  constructor(private repository: ICompanyRepository) {}
  execute(callback: (data: any[]) => void): () => void {
    return this.repository.subscribeToCompanies(callback);
  }

  executeForUser(userId: string, callback: (data: any[]) => void): () => void {
    return this.repository.observeUserCompanies(userId, callback);
  }
}
