import { ExpenseGateway } from '../../../infrastructure/gateways/ExpenseGateway';
export class ObserveExpensesUseCase {
  constructor(private gateway: ExpenseGateway) {}
  execute(companyId: string, callback: (expenses: any[]) => void): () => void {
    return this.gateway.observeExpenses(companyId, callback);
  }
}
