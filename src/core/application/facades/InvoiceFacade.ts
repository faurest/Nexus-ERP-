import { IInvoiceFacade } from '../interfaces/IInvoiceFacade';

export class InvoiceFacade implements IInvoiceFacade {
  constructor(
    private createInvoiceUseCase: any,
    private updateInvoiceUseCase: any,
    private deleteInvoiceUseCase: any,
    private getInvoiceUseCase: any,
    private listInvoicesUseCase: any,
    private observeInvoicesUseCase: any
  ) {}

  async createInvoice(invoice: any): Promise<string> { return this.createInvoiceUseCase.execute(invoice); }
  async updateInvoice(id: string, data: any): Promise<void> { return this.updateInvoiceUseCase.execute(id, data); }
  async deleteInvoice(id: string): Promise<void> { return this.deleteInvoiceUseCase.execute(id); }
  async getInvoice(id: string): Promise<any> { return this.getInvoiceUseCase.execute(id); }
  async listInvoices(companyId: string): Promise<any[]> { return this.listInvoicesUseCase.execute(companyId); }
  observeInvoices(companyId: string, callback: (invoices: any[]) => void): () => void { return this.observeInvoicesUseCase.execute(companyId, callback); }
}
