import { ITaskRepository } from '../../../domain/repositories/ITaskRepository';
export class UpdateTaskUseCase {
  constructor(private repository: ITaskRepository) {}
  async execute(id: string, data: any): Promise<void> { return this.repository.update(id, data); }
}
