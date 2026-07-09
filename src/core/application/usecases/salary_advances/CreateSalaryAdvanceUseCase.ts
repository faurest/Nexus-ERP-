import { ISalaryAdvanceRepository } from '../../../domain/repositories/ISalaryAdvanceRepository';
export class CreateSalaryAdvanceUseCase {
  constructor(private repository: ISalaryAdvanceRepository) {}
  async execute(data: any): Promise<string> { return this.repository.create(data); }
}
