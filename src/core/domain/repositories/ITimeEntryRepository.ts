export interface ITimeEntryRepository {
  create(data: any): Promise<string>;
  update(id: string, data: any): Promise<void>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<any>;
  list(companyId: string): Promise<any[]>;
  observe(companyId: string, callback: (items: any[]) => void): () => void;
}
