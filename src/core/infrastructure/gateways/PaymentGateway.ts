import { IPaymentRepository } from '../../domain/repositories/IPaymentRepository';

export class PaymentGateway {
  constructor(private repository: IPaymentRepository) {}

  async getPayments(companyId: string): Promise<any[]> {
    return this.repository.getPayments(companyId);
  }

  async getPaymentById(companyId: string, id: string): Promise<any | null> {
    return this.repository.getPaymentById(companyId, id);
  }

  async createPayment(companyId: string, payment: any): Promise<string> {
    return this.repository.createPayment(companyId, payment);
  }

  async updatePayment(companyId: string, id: string, data: any): Promise<void> {
    return this.repository.updatePayment(companyId, id, data);
  }

  async deletePayment(companyId: string, id: string): Promise<void> {
    return this.repository.deletePayment(companyId, id);
  }

  observePayments(companyId: string, callback: (payments: any[]) => void): () => void {
    return this.repository.observePayments(companyId, callback);
  }
}
