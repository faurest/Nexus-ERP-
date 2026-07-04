import { ICustomerRepository } from '../../../domain/repositories/ICustomerRepository';

export class CreateCustomerUseCase {
  constructor(private repository: ICustomerRepository) {}
  async execute(data: any): Promise<string> {
    return this.repository.createCustomer(data);
  }
}
