import { ITaskRepository } from '../../../domain/repositories/ITaskRepository';
export class GetTaskUseCase {
  constructor(private repository: ITaskRepository) {}
  async execute(id: string): Promise<any> { return this.repository.getById(id); }
}
