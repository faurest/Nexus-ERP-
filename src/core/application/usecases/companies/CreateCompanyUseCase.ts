import { ICompanyRepository } from '../../../domain/repositories/ICompanyRepository';

export class CreateCompanyUseCase {
  constructor(private repository: ICompanyRepository) {}
  async execute(data: any): Promise<string> {
    return this.repository.createCompany(data);
  }
}
