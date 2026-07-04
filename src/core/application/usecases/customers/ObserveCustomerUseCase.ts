import { ICustomerRepository } from '../../../domain/repositories/ICustomerRepository';

export class ObserveCustomerUseCase {
  constructor(private repository: ICustomerRepository) {}
  execute(companyId: string, callback: (data: any[]) => void): () => void {
    return this.repository.subscribeToCustomers(companyId, callback);
  }
}
