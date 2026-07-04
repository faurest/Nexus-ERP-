import { IInvoiceRepository } from '../../../domain/repositories/IInvoiceRepository';

export class UpdateInvoiceUseCase {
  constructor(private repository: IInvoiceRepository) {}
  async execute(id: string, data: any): Promise<void> {
    return this.repository.updateInvoice(id, data);
  }
}
