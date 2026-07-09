import { IOpenOrderRepository } from '../../../domain/repositories/IOpenOrderRepository';

export class DeleteOpenOrderUseCase {
  constructor(private repository: IOpenOrderRepository) {}

  async execute(companyId: string, id: string) {
    return this.repository.delete(companyId, id);
  }
}
