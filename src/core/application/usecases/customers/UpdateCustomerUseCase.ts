import { ICustomerRepository } from '../../../domain/repositories/ICustomerRepository';

export class UpdateCustomerUseCase {
  constructor(private repository: ICustomerRepository) {}
  async execute(id: string, data: any): Promise<void> {
    return this.repository.updateCustomer(id, data);
  }
}
