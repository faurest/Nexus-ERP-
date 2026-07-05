export interface IExpenseRepository {
  getExpenses(companyId: string): Promise<any[]>;
  getExpenseById(companyId: string, id: string): Promise<any | null>;
  createExpense(companyId: string, expense: any): Promise<string>;
  updateExpense(companyId: string, id: string, data: any): Promise<void>;
  deleteExpense(companyId: string, id: string): Promise<void>;
  observeExpenses(companyId: string, callback: (expenses: any[]) => void): () => void;
}
