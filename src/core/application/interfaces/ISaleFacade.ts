export interface ISaleFacade {
  createSale(companyId: string, data: any): Promise<string>;
  updateSale(companyId: string, id: string, data: any): Promise<void>;
  deleteSale(companyId: string, id: string): Promise<void>;
  getSale(companyId: string, id: string): Promise<any>;
  listSales(companyId: string): Promise<any[]>;
  observeSales(companyId: string, callback: (items: any[]) => void): () => void;
}
