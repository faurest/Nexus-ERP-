export interface ISupportFacade {
  createTicket(companyId: string, ticket: any): Promise<void>;
  updateTicket(companyId: string, id: string, data: any): Promise<void>;
  deleteTicket(companyId: string, id: string): Promise<void>;
  getTicket(companyId: string, id: string): Promise<any>;
  listTickets(companyId: string): Promise<any[]>;
  observeTickets(companyId: string, callback: (tickets: any[]) => void): () => void;
}
