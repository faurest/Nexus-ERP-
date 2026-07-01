import { ICustomerRepository } from '../../domain/repositories/ICustomerRepository';
import { RepositoryException } from '../exceptions/AppException';

export class CustomerUseCases {
  constructor(private customerRepository: ICustomerRepository) {}

  async getCustomers(companyId: string) {
    try {
      return await this.customerRepository.getCustomers(companyId);
    } catch (error) {
      throw new RepositoryException('Failed to get customers', error);
    }
  }

  async getCustomerById(id: string) {
    try {
      return await this.customerRepository.getCustomerById(id);
    } catch (error) {
      throw new RepositoryException(`Failed to get customer ${id}`, error);
    }
  }

  async createCustomer(customer: any) {
    try {
      return await this.customerRepository.createCustomer(customer);
    } catch (error) {
      throw new RepositoryException('Failed to create customer', error);
    }
  }

  async updateCustomer(id: string, data: any) {
    try {
      await this.customerRepository.updateCustomer(id, data);
    } catch (error) {
      throw new RepositoryException(`Failed to update customer ${id}`, error);
    }
  }

  async deleteCustomer(id: string) {
    try {
      await this.customerRepository.deleteCustomer(id);
    } catch (error) {
      throw new RepositoryException(`Failed to delete customer ${id}`, error);
    }
  }

  subscribeToCustomers(companyId: string, callback: (customers: any[]) => void) {
    return this.customerRepository.subscribeToCustomers(companyId, callback);
  }
}
