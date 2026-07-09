import { ISalaryAdvanceRepository } from '../../../domain/repositories/ISalaryAdvanceRepository';
export class UpdateSalaryAdvanceUseCase {
  constructor(private repository: ISalaryAdvanceRepository) {}
  async execute(id: string, data: any): Promise<void> { return this.repository.update(id, data); }
}
