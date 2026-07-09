import { ISaleRepository } from '../../../domain/repositories/ISaleRepository';

export class CreateSaleUseCase {
  constructor(private repository: ISaleRepository) {}

  async execute(companyId: string, data: any) {
    return this.repository.create(companyId, data);
  }
}
