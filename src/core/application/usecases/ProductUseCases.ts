import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { RepositoryException } from '../exceptions/AppException';

export class ProductUseCases {
  constructor(private productRepository: IProductRepository) {}

  async getProducts(companyId: string) {
    try {
      return await this.productRepository.getProducts(companyId);
    } catch (error) {
      throw new RepositoryException('Failed to get products', error);
    }
  }

  async getProductById(id: string) {
    try {
      return await this.productRepository.getProductById(id);
    } catch (error) {
      throw new RepositoryException(`Failed to get product ${id}`, error);
    }
  }

  async createProduct(product: any) {
    try {
      return await this.productRepository.createProduct(product);
    } catch (error) {
      throw new RepositoryException('Failed to create product', error);
    }
  }

  async updateProduct(id: string, data: any) {
    try {
      await this.productRepository.updateProduct(id, data);
    } catch (error) {
      throw new RepositoryException(`Failed to update product ${id}`, error);
    }
  }

  async deleteProduct(id: string) {
    try {
      await this.productRepository.deleteProduct(id);
    } catch (error) {
      throw new RepositoryException(`Failed to delete product ${id}`, error);
    }
  }

  subscribeToProducts(companyId: string, callback: (products: any[]) => void) {
    return this.productRepository.subscribeToProducts(companyId, callback);
  }
}
