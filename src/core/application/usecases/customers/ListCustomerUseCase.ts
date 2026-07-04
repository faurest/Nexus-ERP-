import { ICustomerRepository } from '../../../domain/repositories/ICustomerRepository';

export class ListCustomerUseCase {
  constructor(private repository: ICustomerRepository) {}
  async execute(companyId: string): Promise<any[]> {
    return this.repository.getCustomers(companyId);
  }
}
