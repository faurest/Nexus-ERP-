import { ICustomerRepository } from '../../../domain/repositories/ICustomerRepository';

export class GetCustomerUseCase {
  constructor(private repository: ICustomerRepository) {}
  async execute(id: string): Promise<any> {
    return this.repository.getCustomerById(id);
  }
}
