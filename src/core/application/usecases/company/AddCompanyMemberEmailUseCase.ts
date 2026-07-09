import { ICompanyRepository } from '../../../domain/repositories/ICompanyRepository';
export class AddCompanyMemberEmailUseCase {
  constructor(private repository: ICompanyRepository) {}
  async execute(companyId: string, email: string): Promise<void> {
    return this.repository.addMemberEmail(companyId, email);
  }
}
