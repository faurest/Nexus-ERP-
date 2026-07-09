import { IResourceRepository } from '../../../domain/repositories/IResourceRepository';

export class UpdateResourceUseCase {
  constructor(private repository: IResourceRepository) {}

  async execute(companyId: string, id: string, data: any) {
    return this.repository.update(companyId, id, data);
  }
}
