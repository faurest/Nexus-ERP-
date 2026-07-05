import { ExpenseGateway } from '../../../infrastructure/gateways/ExpenseGateway';
export class UpdateExpenseUseCase {
  constructor(private gateway: ExpenseGateway) {}
  async execute(companyId: string, id: string, data: any): Promise<void> {
    return this.gateway.updateExpense(companyId, id, data);
  }
}
