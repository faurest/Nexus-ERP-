export interface IResourceFacade {
  createResource(companyId: string, data: any): Promise<string>;
  updateResource(companyId: string, id: string, data: any): Promise<void>;
  deleteResource(companyId: string, id: string): Promise<void>;
  getResource(companyId: string, id: string): Promise<any>;
  listResources(companyId: string): Promise<any[]>;
  observeResources(companyId: string, callback: (items: any[]) => void): () => void;
}
