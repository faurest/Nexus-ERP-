import { IInvoiceRepository } from '../../../domain/repositories/IInvoiceRepository';

export class GetInvoiceUseCase {
  constructor(private repository: IInvoiceRepository) {}
  async execute(id: string): Promise<any> {
    return this.repository.getInvoiceById(id);
  }
}
