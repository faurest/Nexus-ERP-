import { PaymentGateway } from '../../../infrastructure/gateways/PaymentGateway';
export class ObservePaymentsUseCase {
  constructor(private gateway: PaymentGateway) {}
  execute(companyId: string, callback: (payments: any[]) => void): () => void {
    return this.gateway.observePayments(companyId, callback);
  }
}
