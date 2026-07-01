export interface ICustomerFacade {
  createCustomer(customer: any): Promise<string>;
  updateCustomer(id: string, data: any): Promise<void>;
  deleteCustomer(id: string): Promise<void>;
  getCustomer(id: string): Promise<any>;
  listCustomers(companyId: string): Promise<any[]>;
  observeCustomers(companyId: string, callback: (customers: any[]) => void): () => void;
}
