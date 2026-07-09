import { IServiceRepository } from '../../../domain/repositories/IServiceRepository';

export class GetServiceUseCase {
  constructor(private repository: IServiceRepository) {}

  async execute(companyId: string, id: string) {
    return this.repository.get(companyId, id);
  }
}
