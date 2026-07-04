import { ICompanyRepository } from '../../../domain/repositories/ICompanyRepository';

export class GetCompanyUseCase {
  constructor(private repository: ICompanyRepository) {}
  async execute(id: string): Promise<any> {
    return this.repository.getCompanyById(id);
  }
}
