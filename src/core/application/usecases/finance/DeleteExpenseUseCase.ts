import { ExpenseGateway } from '../../../infrastructure/gateways/ExpenseGateway';
export class DeleteExpenseUseCase {
  constructor(private gateway: ExpenseGateway) {}
  async execute(companyId: string, id: string): Promise<void> {
    return this.gateway.deleteExpense(companyId, id);
  }
}
