import { ICompanyRepository } from '../../../domain/repositories/ICompanyRepository';

export class UpdateCompanyUseCase {
  constructor(private repository: ICompanyRepository) {}
  async execute(id: string, data: any): Promise<void> {
    return this.repository.updateCompany(id, data);
  }
}
