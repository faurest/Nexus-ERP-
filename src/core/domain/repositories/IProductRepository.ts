export interface IProductRepository {
  getProducts(companyId: string): Promise<any[]>;
  getProductById(id: string): Promise<any | null>;
  createProduct(product: any): Promise<string>;
  updateProduct(id: string, data: any): Promise<void>;
  deleteProduct(id: string): Promise<void>;
  subscribeToProducts(companyId: string, callback: (products: any[]) => void): () => void;
}
