import { IProductFacade } from '../interfaces/IProductFacade';

export class ProductFacade implements IProductFacade {
  constructor(
    private createProductUseCase: any,
    private updateProductUseCase: any,
    private deleteProductUseCase: any,
    private getProductUseCase: any,
    private listProductsUseCase: any,
    private observeProductsUseCase: any
  ) {}

  async createProduct(product: any): Promise<string> { return this.createProductUseCase.execute(product); }
  async updateProduct(id: string, data: any): Promise<void> { return this.updateProductUseCase.execute(id, data); }
  async deleteProduct(id: string): Promise<void> { return this.deleteProductUseCase.execute(id); }
  async getProduct(id: string): Promise<any> { return this.getProductUseCase.execute(id); }
  async listProducts(companyId: string): Promise<any[]> { return this.listProductsUseCase.execute(companyId); }
  observeProducts(companyId: string, callback: (products: any[]) => void): () => void { return this.observeProductsUseCase.execute(companyId, callback); }
}
