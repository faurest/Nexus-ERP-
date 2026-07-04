import { IInvoiceRepository } from '../../../domain/repositories/IInvoiceRepository';

export class CreateInvoiceUseCase {
  constructor(private repository: IInvoiceRepository) {}
  async execute(data: any): Promise<string> {
    return this.repository.createInvoice(data);
  }
}
