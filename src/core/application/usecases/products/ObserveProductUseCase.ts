import { IProductRepository } from '../../../domain/repositories/IProductRepository';

export class ObserveProductUseCase {
  constructor(private repository: IProductRepository) {}
  execute(companyId: string, callback: (data: any[]) => void): () => void {
    return this.repository.subscribeToProducts(companyId, callback);
  }
}
