import { IResourceRepository } from '../../../domain/repositories/IResourceRepository';

export class CreateResourceUseCase {
  constructor(private repository: IResourceRepository) {}

  async execute(companyId: string, data: any) {
    return this.repository.create(companyId, data);
  }
}
