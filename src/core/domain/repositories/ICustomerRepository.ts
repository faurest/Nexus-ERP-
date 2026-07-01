export interface ICustomerRepository {
  getCustomers(companyId: string): Promise<any[]>;
  getCustomerById(id: string): Promise<any | null>;
  createCustomer(customer: any): Promise<string>;
  updateCustomer(id: string, data: any): Promise<void>;
  deleteCustomer(id: string): Promise<void>;
  subscribeToCustomers(companyId: string, callback: (customers: any[]) => void): () => void;
}
