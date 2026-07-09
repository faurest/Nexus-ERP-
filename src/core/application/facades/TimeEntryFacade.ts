import { ITimeEntryFacade } from '../interfaces/ITimeEntryFacade';
import { CreateTimeEntryUseCase } from '../usecases/time_entries/CreateTimeEntryUseCase';
import { UpdateTimeEntryUseCase } from '../usecases/time_entries/UpdateTimeEntryUseCase';
import { DeleteTimeEntryUseCase } from '../usecases/time_entries/DeleteTimeEntryUseCase';
import { GetTimeEntryUseCase } from '../usecases/time_entries/GetTimeEntryUseCase';
import { ListTimeEntriesUseCase } from '../usecases/time_entries/ListTimeEntriesUseCase';
import { ObserveTimeEntriesUseCase } from '../usecases/time_entries/ObserveTimeEntriesUseCase';

export class TimeEntryFacade implements ITimeEntryFacade {
  constructor(
    private createUseCase: CreateTimeEntryUseCase,
    private updateUseCase: UpdateTimeEntryUseCase,
    private deleteUseCase: DeleteTimeEntryUseCase,
    private getUseCase: GetTimeEntryUseCase,
    private listUseCase: ListTimeEntriesUseCase,
    private observeUseCase: ObserveTimeEntriesUseCase
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
