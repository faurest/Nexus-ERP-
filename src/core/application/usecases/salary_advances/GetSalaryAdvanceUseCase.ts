import { ISalaryAdvanceRepository } from '../../../domain/repositories/ISalaryAdvanceRepository';
export class GetSalaryAdvanceUseCase {
  constructor(private repository: ISalaryAdvanceRepository) {}
  async execute(id: string): Promise<any> { return this.repository.getById(id); }
}
