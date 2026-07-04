import { ICompanyRepository } from '../../../domain/repositories/ICompanyRepository';

export class ListCompanyUseCase {
  constructor(private repository: ICompanyRepository) {}
  async execute(): Promise<any[]> {
    return this.repository.getCompanies();
  }
}
