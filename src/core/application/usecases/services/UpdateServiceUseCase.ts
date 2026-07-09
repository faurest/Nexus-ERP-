import { IServiceRepository } from '../../../domain/repositories/IServiceRepository';

export class UpdateServiceUseCase {
  constructor(private repository: IServiceRepository) {}

  async execute(companyId: string, id: string, data: any) {
    return this.repository.update(companyId, id, data);
  }
}
