import { ILeaveRequestFacade } from '../interfaces/ILeaveRequestFacade';
import { CreateLeaveRequestUseCase } from '../usecases/leave_requests/CreateLeaveRequestUseCase';
import { UpdateLeaveRequestUseCase } from '../usecases/leave_requests/UpdateLeaveRequestUseCase';
import { DeleteLeaveRequestUseCase } from '../usecases/leave_requests/DeleteLeaveRequestUseCase';
import { GetLeaveRequestUseCase } from '../usecases/leave_requests/GetLeaveRequestUseCase';
import { ListLeaveRequestsUseCase } from '../usecases/leave_requests/ListLeaveRequestsUseCase';
import { ObserveLeaveRequestsUseCase } from '../usecases/leave_requests/ObserveLeaveRequestsUseCase';

export class LeaveRequestFacade implements ILeaveRequestFacade {
  constructor(
    private createUseCase: CreateLeaveRequestUseCase,
    private updateUseCase: UpdateLeaveRequestUseCase,
    private deleteUseCase: DeleteLeaveRequestUseCase,
    private getUseCase: GetLeaveRequestUseCase,
    private listUseCase: ListLeaveRequestsUseCase,
    private observeUseCase: ObserveLeaveRequestsUseCase
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
