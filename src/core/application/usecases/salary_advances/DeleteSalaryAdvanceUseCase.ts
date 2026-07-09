import { ISalaryAdvanceRepository } from '../../../domain/repositories/ISalaryAdvanceRepository';
export class DeleteSalaryAdvanceUseCase {
  constructor(private repository: ISalaryAdvanceRepository) {}
  async execute(id: string): Promise<void> { return this.repository.delete(id); }
}
