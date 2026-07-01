import { ISupportFacade } from '../interfaces/ISupportFacade';

export class SupportFacade implements ISupportFacade {
  constructor(
    private createTicketUseCase: any,
    private updateTicketUseCase: any,
    private deleteTicketUseCase: any,
    private getTicketUseCase: any,
    private listTicketsUseCase: any,
    private observeTicketsUseCase: any
  ) {}

  async createTicket(ticket: any): Promise<string> { return this.createTicketUseCase.execute(ticket); }
  async updateTicket(id: string, data: any): Promise<void> { return this.updateTicketUseCase.execute(id, data); }
  async deleteTicket(id: string): Promise<void> { return this.deleteTicketUseCase.execute(id); }
  async getTicket(id: string): Promise<any> { return this.getTicketUseCase.execute(id); }
  async listTickets(companyId: string): Promise<any[]> { return this.listTicketsUseCase.execute(companyId); }
  observeTickets(companyId: string, callback: (tickets: any[]) => void): () => void { return this.observeTicketsUseCase.execute(companyId, callback); }
}
