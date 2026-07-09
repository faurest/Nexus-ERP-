import { IOpenOrderRepository } from '../../../domain/repositories/IOpenOrderRepository';

export class ObserveOpenOrdersUseCase {
  constructor(private repository: IOpenOrderRepository) {}

  execute(companyId: string, callback: (items: any[]) => void) {
    return this.repository.observe(companyId, callback);
  }
}
