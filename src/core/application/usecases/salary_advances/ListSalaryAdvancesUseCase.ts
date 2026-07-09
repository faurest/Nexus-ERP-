import { ISalaryAdvanceRepository } from '../../../domain/repositories/ISalaryAdvanceRepository';
export class ListSalaryAdvancesUseCase {
  constructor(private repository: ISalaryAdvanceRepository) {}
  async execute(companyId: string): Promise<any[]> { return this.repository.list(companyId); }
}
