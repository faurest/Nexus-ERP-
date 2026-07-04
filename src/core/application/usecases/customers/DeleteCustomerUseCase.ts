import { ICustomerRepository } from '../../../domain/repositories/ICustomerRepository';

export class DeleteCustomerUseCase {
  constructor(private repository: ICustomerRepository) {}
  async execute(id: string): Promise<void> {
    return this.repository.deleteCustomer(id);
  }
}
