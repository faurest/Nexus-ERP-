export interface IProductFacade {
  createProduct(product: any): Promise<string>;
  updateProduct(id: string, data: any): Promise<void>;
  deleteProduct(id: string): Promise<void>;
  getProduct(id: string): Promise<any>;
  listProducts(companyId: string): Promise<any[]>;
  observeProducts(companyId: string, callback: (products: any[]) => void): () => void;
}
