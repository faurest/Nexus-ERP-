import { ICustomerFacade } from '../interfaces/ICustomerFacade';

export class CustomerFacade implements ICustomerFacade {
  constructor(
    private createCustomerUseCase: any,
    private updateCustomerUseCase: any,
    private deleteCustomerUseCase: any,
    private getCustomerUseCase: any,
    private listCustomersUseCase: any,
    private observeCustomersUseCase: any
  ) {}

  async createCustomer(customer: any): Promise<string> {
    return this.createCustomerUseCase.execute(customer);
  }

  async updateCustomer(id: string, data: any): Promise<void> {
    return this.updateCustomerUseCase.execute(id, data);
  }

  async deleteCustomer(id: string): Promise<void> {
    return this.deleteCustomerUseCase.execute(id);
  }

  async getCustomer(id: string): Promise<any> {
    return this.getCustomerUseCase.execute(id);
  }

  async listCustomers(companyId: string): Promise<any[]> {
    return this.listCustomersUseCase.execute(companyId);
  }

  observeCustomers(companyId: string, callback: (customers: any[]) => void): () => void {
    return this.observeCustomersUseCase.execute(companyId, callback);
  }
}
