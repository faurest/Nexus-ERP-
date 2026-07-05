export interface IPaymentRepository {
  getPayments(companyId: string): Promise<any[]>;
  getPaymentById(companyId: string, id: string): Promise<any | null>;
  createPayment(companyId: string, payment: any): Promise<string>;
  updatePayment(companyId: string, id: string, data: any): Promise<void>;
  deletePayment(companyId: string, id: string): Promise<void>;
  observePayments(companyId: string, callback: (payments: any[]) => void): () => void;
}
