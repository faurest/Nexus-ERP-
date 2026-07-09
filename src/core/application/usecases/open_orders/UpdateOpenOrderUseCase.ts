import { IOpenOrderRepository } from '../../../domain/repositories/IOpenOrderRepository';

export class UpdateOpenOrderUseCase {
  constructor(private repository: IOpenOrderRepository) {}

  async execute(companyId: string, id: string, data: any) {
    return this.repository.update(companyId, id, data);
  }
}
