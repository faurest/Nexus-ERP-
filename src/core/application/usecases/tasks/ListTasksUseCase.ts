import { ITaskRepository } from '../../../domain/repositories/ITaskRepository';
export class ListTasksUseCase {
  constructor(private repository: ITaskRepository) {}
  async execute(companyId: string): Promise<any[]> { return this.repository.list(companyId); }
}
