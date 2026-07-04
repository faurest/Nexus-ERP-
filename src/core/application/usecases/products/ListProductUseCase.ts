import { IProductRepository } from '../../../domain/repositories/IProductRepository';

export class ListProductUseCase {
  constructor(private repository: IProductRepository) {}
  async execute(companyId: string): Promise<any[]> {
    return this.repository.getProducts(companyId);
  }
}
