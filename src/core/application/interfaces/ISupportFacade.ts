export interface ISupportFacade {
  createTicket(ticket: any): Promise<string>;
  updateTicket(id: string, data: any): Promise<void>;
  deleteTicket(id: string): Promise<void>;
  getTicket(id: string): Promise<any>;
  listTickets(companyId: string): Promise<any[]>;
  observeTickets(companyId: string, callback: (tickets: any[]) => void): () => void;
}
