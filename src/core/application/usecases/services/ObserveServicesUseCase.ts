import { IServiceRepository } from '../../../domain/repositories/IServiceRepository';

export class ObserveServicesUseCase {
  constructor(private repository: IServiceRepository) {}

  execute(companyId: string, callback: (items: any[]) => void) {
    return this.repository.observe(companyId, callback);
  }
}
