import { ICompanyRepository } from '../../../domain/repositories/ICompanyRepository';

export class DeleteCompanyUseCase {
  constructor(private repository: ICompanyRepository) {}
  async execute(id: string): Promise<void> {
    return this.repository.deleteCompany(id);
  }
}
