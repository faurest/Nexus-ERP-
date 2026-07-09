import { ITaskRepository } from '../../../domain/repositories/ITaskRepository';
export class ObserveTasksUseCase {
  constructor(private repository: ITaskRepository) {}
  execute(companyId: string, callback: (items: any[]) => void): () => void { return this.repository.observe(companyId, callback); }
}
