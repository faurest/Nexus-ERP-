import { IOpenOrderRepository } from '../../../domain/repositories/IOpenOrderRepository';

export class ListOpenOrdersUseCase {
  constructor(private repository: IOpenOrderRepository) {}

  async execute(companyId: string) {
    return this.repository.list(companyId);
  }
}
