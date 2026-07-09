import { ISalaryAdvanceRepository } from '../../../domain/repositories/ISalaryAdvanceRepository';
export class ObserveSalaryAdvancesUseCase {
  constructor(private repository: ISalaryAdvanceRepository) {}
  execute(companyId: string, callback: (items: any[]) => void): () => void { return this.repository.observe(companyId, callback); }
}
