import { IProductRepository } from '../../../domain/repositories/IProductRepository';

export class CreateProductUseCase {
  constructor(private repository: IProductRepository) {}
  async execute(data: any): Promise<string> {
    return this.repository.createProduct(data);
  }
}
