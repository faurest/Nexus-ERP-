import { IOpenOrderRepository } from '../../../domain/repositories/IOpenOrderRepository';

export class CreateOpenOrderUseCase {
  constructor(private repository: IOpenOrderRepository) {}

  async execute(companyId: string, data: any) {
    return this.repository.create(companyId, data);
  }
}
