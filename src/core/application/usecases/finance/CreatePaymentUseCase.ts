import { PaymentGateway } from '../../../infrastructure/gateways/PaymentGateway';
export class CreatePaymentUseCase {
  constructor(private gateway: PaymentGateway) {}
  async execute(companyId: string, payment: any): Promise<string> {
    return this.gateway.createPayment(companyId, payment);
  }
}
