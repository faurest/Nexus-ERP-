import { IOpenOrderRepository } from '../../../domain/repositories/IOpenOrderRepository';

export class GetOpenOrderUseCase {
  constructor(private repository: IOpenOrderRepository) {}

  async execute(companyId: string, id: string) {
    return this.repository.get(companyId, id);
  }
}
