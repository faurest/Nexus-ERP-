import { IServiceRepository } from '../../../domain/repositories/IServiceRepository';

export class DeleteServiceUseCase {
  constructor(private repository: IServiceRepository) {}

  async execute(companyId: string, id: string) {
    return this.repository.delete(companyId, id);
  }
}
