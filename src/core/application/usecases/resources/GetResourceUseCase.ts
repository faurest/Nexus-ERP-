import { IResourceRepository } from '../../../domain/repositories/IResourceRepository';

export class GetResourceUseCase {
  constructor(private repository: IResourceRepository) {}

  async execute(companyId: string, id: string) {
    return this.repository.get(companyId, id);
  }
}
