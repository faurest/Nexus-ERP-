export interface IInvoiceRepository {
  getInvoices(companyId: string): Promise<any[]>;
  getInvoiceById(id: string): Promise<any | null>;
  createInvoice(invoice: any): Promise<string>;
  updateInvoice(id: string, data: any): Promise<void>;
  deleteInvoice(id: string): Promise<void>;
  subscribeToInvoices(companyId: string, callback: (invoices: any[]) => void): () => void;
}
