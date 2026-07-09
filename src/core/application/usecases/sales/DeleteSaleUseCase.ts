import { ISaleRepository } from '../../../domain/repositories/ISaleRepository';

export class DeleteSaleUseCase {
  constructor(private repository: ISaleRepository) {}

  async execute(companyId: string, id: string) {
    return this.repository.delete(companyId, id);
  }
}
