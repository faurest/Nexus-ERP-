import { PaymentGateway } from '../../../infrastructure/gateways/PaymentGateway';
export class UpdatePaymentUseCase {
  constructor(private gateway: PaymentGateway) {}
  async execute(companyId: string, id: string, data: any): Promise<void> {
    return this.gateway.updatePayment(companyId, id, data);
  }
}
