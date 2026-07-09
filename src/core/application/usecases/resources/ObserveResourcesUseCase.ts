import { IResourceRepository } from '../../../domain/repositories/IResourceRepository';

export class ObserveResourcesUseCase {
  constructor(private repository: IResourceRepository) {}

  execute(companyId: string, callback: (items: any[]) => void) {
    return this.repository.observe(companyId, callback);
  }
}
