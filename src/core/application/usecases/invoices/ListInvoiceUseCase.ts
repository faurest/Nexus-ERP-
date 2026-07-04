import { IInvoiceRepository } from '../../../domain/repositories/IInvoiceRepository';

export class ListInvoiceUseCase {
  constructor(private repository: IInvoiceRepository) {}
  async execute(companyId: string): Promise<any[]> {
    return this.repository.getInvoices(companyId);
  }
}
