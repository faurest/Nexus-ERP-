import { PaymentGateway } from '../../../infrastructure/gateways/PaymentGateway';
export class DeletePaymentUseCase {
  constructor(private gateway: PaymentGateway) {}
  async execute(companyId: string, id: string): Promise<void> {
    return this.gateway.deletePayment(companyId, id);
  }
}
