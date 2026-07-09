import { IResourceRepository } from '../../../domain/repositories/IResourceRepository';

export class ListResourcesUseCase {
  constructor(private repository: IResourceRepository) {}

  async execute(companyId: string) {
    return this.repository.list(companyId);
  }
}
