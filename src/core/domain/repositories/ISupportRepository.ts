export interface ISupportRepository {
  createTicket(companyId: string, ticketData: any): Promise<void>;
  observeTickets(companyId: string, callback: (tickets: any[]) => void): () => void;
  updateTicket?(companyId: string, id: string, ticketData: any): Promise<void>;
  deleteTicket?(companyId: string, id: string): Promise<void>;
  getTicket?(companyId: string, id: string): Promise<any>;
  listTickets?(companyId: string): Promise<any[]>;
}
