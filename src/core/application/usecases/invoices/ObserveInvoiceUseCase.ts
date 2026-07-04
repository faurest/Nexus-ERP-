import { IInvoiceRepository } from '../../../domain/repositories/IInvoiceRepository';

export class ObserveInvoiceUseCase {
  constructor(private repository: IInvoiceRepository) {}
  execute(companyId: string, callback: (data: any[]) => void): () => void {
    return this.repository.subscribeToInvoices(companyId, callback);
  }
}
