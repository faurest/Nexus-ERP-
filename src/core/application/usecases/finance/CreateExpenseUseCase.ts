import { ExpenseGateway } from '../../../infrastructure/gateways/ExpenseGateway';
export class CreateExpenseUseCase {
  constructor(private gateway: ExpenseGateway) {}
  async execute(companyId: string, expense: any): Promise<string> {
    return this.gateway.createExpense(companyId, expense);
  }
}
