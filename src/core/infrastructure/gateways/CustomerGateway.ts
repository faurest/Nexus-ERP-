import { ICustomerRepository } from '../../domain/repositories/ICustomerRepository';
import { BaseGateway } from './BaseGateway';
import { FirebaseCustomerRepository } from '../firebase/FirebaseCustomerRepository';
// import { SupabaseCustomerRepository } from '../supabase/SupabaseCustomerRepository'; // TODO

export class CustomerGateway extends BaseGateway implements ICustomerRepository {
  private firebaseRepo = new FirebaseCustomerRepository();
  // private supabaseRepo = new SupabaseCustomerRepository();
  private supabaseRepo: any = null; // Mock until implemented

  async getCustomers(companyId: string) {
    return this.execute('getCustomers', 
      () => this.firebaseRepo.getCustomers(companyId), 
      () => this.supabaseRepo.getCustomers(companyId), 
      true
    );
  }

  async getCustomerById(id: string) {
    return this.execute('getCustomerById', 
      () => this.firebaseRepo.getCustomerById(id), 
      () => this.supabaseRepo.getCustomerById(id), 
      true
    );
  }

  async createCustomer(customer: any) {
    return this.execute('createCustomer', 
      () => this.firebaseRepo.createCustomer(customer), 
      () => this.supabaseRepo.createCustomer(customer)
    );
  }

  async updateCustomer(id: string, data: any) {
    return this.execute('updateCustomer', 
      () => this.firebaseRepo.updateCustomer(id, data), 
      () => this.supabaseRepo.updateCustomer(id, data)
    );
  }

  async deleteCustomer(id: string) {
    return this.execute('deleteCustomer', 
      () => this.firebaseRepo.deleteCustomer(id), 
      () => this.supabaseRepo.deleteCustomer(id)
    );
  }

  subscribeToCustomers(companyId: string, callback: (customers: any[]) => void) {
    if (this.featureFlags.getProviderMode() === 'SUPABASE') {
      return this.supabaseRepo.subscribeToCustomers(companyId, callback);
    }
    return this.firebaseRepo.subscribeToCustomers(companyId, callback);
  }
}
