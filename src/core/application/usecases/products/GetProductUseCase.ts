import { IProductRepository } from '../../../domain/repositories/IProductRepository';

export class GetProductUseCase {
  constructor(private repository: IProductRepository) {}
  async execute(id: string): Promise<any> {
    return this.repository.getProductById(id);
  }
}
