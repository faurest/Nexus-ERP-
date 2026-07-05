import { IFinanceFacade } from '../interfaces/IFinanceFacade';
import { CreateExpenseUseCase } from '../usecases/finance/CreateExpenseUseCase';
import { UpdateExpenseUseCase } from '../usecases/finance/UpdateExpenseUseCase';
import { DeleteExpenseUseCase } from '../usecases/finance/DeleteExpenseUseCase';
import { ObserveExpensesUseCase } from '../usecases/finance/ObserveExpensesUseCase';
import { CreatePaymentUseCase } from '../usecases/finance/CreatePaymentUseCase';
import { UpdatePaymentUseCase } from '../usecases/finance/UpdatePaymentUseCase';
import { DeletePaymentUseCase } from '../usecases/finance/DeletePaymentUseCase';
import { ObservePaymentsUseCase } from '../usecases/finance/ObservePaymentsUseCase';

export class FinanceFacade implements IFinanceFacade {
  constructor(
    private createExpenseUseCase: CreateExpenseUseCase,
    private updateExpenseUseCase: UpdateExpenseUseCase,
    private deleteExpenseUseCase: DeleteExpenseUseCase,
    private observeExpensesUseCase: ObserveExpensesUseCase,
    private createPaymentUseCase: CreatePaymentUseCase,
    private updatePaymentUseCase: UpdatePaymentUseCase,
    private deletePaymentUseCase: DeletePaymentUseCase,
    private observePaymentsUseCase: ObservePaymentsUseCase
  ) {}

  async createExpense(companyId: string, expense: any): Promise<string> {
    return this.createExpenseUseCase.execute(companyId, expense);
  }

  async updateExpense(companyId: string, id: string, data: any): Promise<void> {
    return this.updateExpenseUseCase.execute(companyId, id, data);
  }

  async deleteExpense(companyId: string, id: string): Promise<void> {
    return this.deleteExpenseUseCase.execute(companyId, id);
  }

  observeExpenses(companyId: string, callback: (expenses: any[]) => void): () => void {
    return this.observeExpensesUseCase.execute(companyId, callback);
  }

  async createPayment(companyId: string, payment: any): Promise<string> {
    return this.createPaymentUseCase.execute(companyId, payment);
  }

  async updatePayment(companyId: string, id: string, data: any): Promise<void> {
    return this.updatePaymentUseCase.execute(companyId, id, data);
  }

  async deletePayment(companyId: string, id: string): Promise<void> {
    return this.deletePaymentUseCase.execute(companyId, id);
  }

  observePayments(companyId: string, callback: (payments: any[]) => void): () => void {
    return this.observePaymentsUseCase.execute(companyId, callback);
  }
}
