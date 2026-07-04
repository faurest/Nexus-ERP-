import { ISupportFacade } from '../interfaces/ISupportFacade';
import { CreateTicketUseCase } from '../usecases/support/CreateTicketUseCase';
import { ObserveTicketsUseCase } from '../usecases/support/ObserveTicketsUseCase';

export class SupportFacade implements ISupportFacade {
  constructor(
    private createTicketUseCase: CreateTicketUseCase,
    private updateTicketUseCase: any,
    private deleteTicketUseCase: any,
    private getTicketUseCase: any,
    private listTicketsUseCase: any,
    private observeTicketsUseCase: ObserveTicketsUseCase
  ) {}

  async createTicket(companyId: string, ticket: any): Promise<void> { return this.createTicketUseCase.execute(companyId, ticket); }
  async updateTicket(companyId: string, id: string, data: any): Promise<void> { /* Not implemented yet */ }
  async deleteTicket(companyId: string, id: string): Promise<void> { /* Not implemented yet */ }
  async getTicket(companyId: string, id: string): Promise<any> { /* Not implemented yet */ return null; }
  async listTickets(companyId: string): Promise<any[]> { /* Not implemented yet */ return []; }
  observeTickets(companyId: string, callback: (tickets: any[]) => void): () => void { return this.observeTicketsUseCase.execute(companyId, callback); }
}
