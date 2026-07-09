import { ITaskFacade } from '../interfaces/ITaskFacade';
import { CreateTaskUseCase } from '../usecases/tasks/CreateTaskUseCase';
import { UpdateTaskUseCase } from '../usecases/tasks/UpdateTaskUseCase';
import { DeleteTaskUseCase } from '../usecases/tasks/DeleteTaskUseCase';
import { GetTaskUseCase } from '../usecases/tasks/GetTaskUseCase';
import { ListTasksUseCase } from '../usecases/tasks/ListTasksUseCase';
import { ObserveTasksUseCase } from '../usecases/tasks/ObserveTasksUseCase';

export class TaskFacade implements ITaskFacade {
  constructor(
    private createUseCase: CreateTaskUseCase,
    private updateUseCase: UpdateTaskUseCase,
    private deleteUseCase: DeleteTaskUseCase,
    private getUseCase: GetTaskUseCase,
    private listUseCase: ListTasksUseCase,
    private observeUseCase: ObserveTasksUseCase
  ) {}

  async create(data: any): Promise<string> { return this.createUseCase.execute(data); }
  async update(id: string, data: any): Promise<void> { return this.updateUseCase.execute(id, data); }
  async delete(id: string): Promise<void> { return this.deleteUseCase.execute(id); }
  async getById(id: string): Promise<any> { return this.getUseCase.execute(id); }
  async list(companyId: string): Promise<any[]> { return this.listUseCase.execute(companyId); }
  observe(companyId: string, callback: (items: any[]) => void): () => void {
    return this.observeUseCase.execute(companyId, callback);
  }
}
