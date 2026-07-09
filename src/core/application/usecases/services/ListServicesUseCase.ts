import { IServiceRepository } from '../../../domain/repositories/IServiceRepository';

export class ListServicesUseCase {
  constructor(private repository: IServiceRepository) {}

  async execute(companyId: string) {
    return this.repository.list(companyId);
  }
}
