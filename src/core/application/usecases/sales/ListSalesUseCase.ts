import { ISaleRepository } from '../../../domain/repositories/ISaleRepository';

export class ListSalesUseCase {
  constructor(private repository: ISaleRepository) {}

  async execute(companyId: string) {
    return this.repository.list(companyId);
  }
}
