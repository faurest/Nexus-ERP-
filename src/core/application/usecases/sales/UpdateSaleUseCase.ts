import { ISaleRepository } from '../../../domain/repositories/ISaleRepository';

export class UpdateSaleUseCase {
  constructor(private repository: ISaleRepository) {}

  async execute(companyId: string, id: string, data: any) {
    return this.repository.update(companyId, id, data);
  }
}
