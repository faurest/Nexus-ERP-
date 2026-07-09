import { ISaleRepository } from '../../../domain/repositories/ISaleRepository';

export class GetSaleUseCase {
  constructor(private repository: ISaleRepository) {}

  async execute(companyId: string, id: string) {
    return this.repository.get(companyId, id);
  }
}
