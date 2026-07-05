export interface IFinanceFacade {
  createExpense(companyId: string, expense: any): Promise<string>;
  updateExpense(companyId: string, id: string, data: any): Promise<void>;
  deleteExpense(companyId: string, id: string): Promise<void>;
  observeExpenses(companyId: string, callback: (expenses: any[]) => void): () => void;
  createPayment(companyId: string, payment: any): Promise<string>;
  updatePayment(companyId: string, id: string, data: any): Promise<void>;
  deletePayment(companyId: string, id: string): Promise<void>;
  observePayments(companyId: string, callback: (payments: any[]) => void): () => void;
}
