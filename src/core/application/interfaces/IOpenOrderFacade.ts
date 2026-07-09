export interface IOpenOrderFacade {
  createOpenOrder(companyId: string, data: any): Promise<string>;
  updateOpenOrder(companyId: string, id: string, data: any): Promise<void>;
  deleteOpenOrder(companyId: string, id: string): Promise<void>;
  getOpenOrder(companyId: string, id: string): Promise<any>;
  listOpenOrders(companyId: string): Promise<any[]>;
  observeOpenOrders(companyId: string, callback: (items: any[]) => void): () => void;
}
