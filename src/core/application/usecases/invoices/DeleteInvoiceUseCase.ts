import { IInvoiceRepository } from '../../../domain/repositories/IInvoiceRepository';

export class DeleteInvoiceUseCase {
  constructor(private repository: IInvoiceRepository) {}
  async execute(id: string): Promise<void> {
    return this.repository.deleteInvoice(id);
  }
}
