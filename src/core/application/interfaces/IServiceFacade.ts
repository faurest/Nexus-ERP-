export interface IServiceFacade {
  createService(companyId: string, data: any): Promise<string>;
  updateService(companyId: string, id: string, data: any): Promise<void>;
  deleteService(companyId: string, id: string): Promise<void>;
  getService(companyId: string, id: string): Promise<any>;
  listServices(companyId: string): Promise<any[]>;
  observeServices(companyId: string, callback: (items: any[]) => void): () => void;
}
