import { IServiceRepository } from '../../../domain/repositories/IServiceRepository';

export class CreateServiceUseCase {
  constructor(private repository: IServiceRepository) {}

  async execute(companyId: string, data: any) {
    return this.repository.create(companyId, data);
  }
}
