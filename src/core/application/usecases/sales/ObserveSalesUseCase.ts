import { ISaleRepository } from '../../../domain/repositories/ISaleRepository';

export class ObserveSalesUseCase {
  constructor(private repository: ISaleRepository) {}

  execute(companyId: string, callback: (items: any[]) => void) {
    return this.repository.observe(companyId, callback);
  }
}
