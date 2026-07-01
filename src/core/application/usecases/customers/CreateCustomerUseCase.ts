import { ICustomerRepository } from '../../../domain/repositories/ICustomerRepository';
import { RepositoryException } from '../../exceptions/AppException';

export class CreateCustomerUseCase {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(customer: any) {
    try {
      return await this.customerRepository.createCustomer(customer);
    } catch (error) {
      throw new RepositoryException('Failed to create customer', error);
    }
  }
}
