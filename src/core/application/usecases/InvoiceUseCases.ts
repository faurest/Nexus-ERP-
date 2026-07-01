import { IInvoiceRepository } from '../../domain/repositories/IInvoiceRepository';
import { RepositoryException } from '../exceptions/AppException';

export class InvoiceUseCases {
  constructor(private invoiceRepository: IInvoiceRepository) {}

  async getInvoices(companyId: string) {
    try {
      return await this.invoiceRepository.getInvoices(companyId);
    } catch (error) {
      throw new RepositoryException('Failed to get invoices', error);
    }
  }

  async getInvoiceById(id: string) {
    try {
      return await this.invoiceRepository.getInvoiceById(id);
    } catch (error) {
      throw new RepositoryException(`Failed to get invoice ${id}`, error);
    }
  }

  async createInvoice(invoice: any) {
    try {
      return await this.invoiceRepository.createInvoice(invoice);
    } catch (error) {
      throw new RepositoryException('Failed to create invoice', error);
    }
  }

  async updateInvoice(id: string, data: any) {
    try {
      await this.invoiceRepository.updateInvoice(id, data);
    } catch (error) {
      throw new RepositoryException(`Failed to update invoice ${id}`, error);
    }
  }

  async deleteInvoice(id: string) {
    try {
      await this.invoiceRepository.deleteInvoice(id);
    } catch (error) {
      throw new RepositoryException(`Failed to delete invoice ${id}`, error);
    }
  }

  subscribeToInvoices(companyId: string, callback: (invoices: any[]) => void) {
    return this.invoiceRepository.subscribeToInvoices(companyId, callback);
  }
}
