export interface IResourceRepository {
  create(companyId: string, data: any): Promise<string>;
  update(companyId: string, id: string, data: any): Promise<void>;
  delete(companyId: string, id: string): Promise<void>;
  get(companyId: string, id: string): Promise<any>;
  list(companyId: string): Promise<any[]>;
  observe(companyId: string, callback: (items: any[]) => void): () => void;
}
