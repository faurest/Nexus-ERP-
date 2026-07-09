import { IResourceRepository } from '../../../domain/repositories/IResourceRepository';

export class DeleteResourceUseCase {
  constructor(private repository: IResourceRepository) {}

  async execute(companyId: string, id: string) {
    return this.repository.delete(companyId, id);
  }
}
