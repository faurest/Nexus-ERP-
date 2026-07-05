import { IExpenseRepository } from '../../domain/repositories/IExpenseRepository';

export class ExpenseGateway {
  constructor(private repository: IExpenseRepository) {}

  async getExpenses(companyId: string): Promise<any[]> {
    return this.repository.getExpenses(companyId);
  }

  async getExpenseById(companyId: string, id: string): Promise<any | null> {
    return this.repository.getExpenseById(companyId, id);
  }

  async createExpense(companyId: string, expense: any): Promise<string> {
    return this.repository.createExpense(companyId, expense);
  }

  async updateExpense(companyId: string, id: string, data: any): Promise<void> {
    return this.repository.updateExpense(companyId, id, data);
  }

  async deleteExpense(companyId: string, id: string): Promise<void> {
    return this.repository.deleteExpense(companyId, id);
  }

  observeExpenses(companyId: string, callback: (expenses: any[]) => void): () => void {
    return this.repository.observeExpenses(companyId, callback);
  }
}
