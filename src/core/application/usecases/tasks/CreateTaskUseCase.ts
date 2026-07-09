import { ITaskRepository } from '../../../domain/repositories/ITaskRepository';
export class CreateTaskUseCase {
  constructor(private repository: ITaskRepository) {}
  async execute(data: any): Promise<string> { return this.repository.create(data); }
}
