import { ITaskRepository } from '../../../domain/repositories/ITaskRepository';
export class DeleteTaskUseCase {
  constructor(private repository: ITaskRepository) {}
  async execute(id: string): Promise<void> { return this.repository.delete(id); }
}
