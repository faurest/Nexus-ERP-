import { IProductRepository } from '../../../domain/repositories/IProductRepository';

export class UpdateProductUseCase {
  constructor(private repository: IProductRepository) {}
  async execute(id: string, data: any): Promise<void> {
    return this.repository.updateProduct(id, data);
  }
}
