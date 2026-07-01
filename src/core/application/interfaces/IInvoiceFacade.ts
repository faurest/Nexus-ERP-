export interface IInvoiceFacade {
  createInvoice(invoice: any): Promise<string>;
  updateInvoice(id: string, data: any): Promise<void>;
  deleteInvoice(id: string): Promise<void>;
  getInvoice(id: string): Promise<any>;
  listInvoices(companyId: string): Promise<any[]>;
  observeInvoices(companyId: string, callback: (invoices: any[]) => void): () => void;
}
