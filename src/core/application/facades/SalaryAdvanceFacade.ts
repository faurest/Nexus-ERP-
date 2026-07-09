import { ISalaryAdvanceFacade } from '../interfaces/ISalaryAdvanceFacade';
import { CreateSalaryAdvanceUseCase } from '../usecases/salary_advances/CreateSalaryAdvanceUseCase';
import { UpdateSalaryAdvanceUseCase } from '../usecases/salary_advances/UpdateSalaryAdvanceUseCase';
import { DeleteSalaryAdvanceUseCase } from '../usecases/salary_advances/DeleteSalaryAdvanceUseCase';
import { GetSalaryAdvanceUseCase } from '../usecases/salary_advances/GetSalaryAdvanceUseCase';
import { ListSalaryAdvancesUseCase } from '../usecases/salary_advances/ListSalaryAdvancesUseCase';
import { ObserveSalaryAdvancesUseCase } from '../usecases/salary_advances/ObserveSalaryAdvancesUseCase';

export class SalaryAdvanceFacade implements ISalaryAdvanceFacade {
  constructor(
    private createUseCase: CreateSalaryAdvanceUseCase,
    private updateUseCase: UpdateSalaryAdvanceUseCase,
    private deleteUseCase: DeleteSalaryAdvanceUseCase,
    private getUseCase: GetSalaryAdvanceUseCase,
    private listUseCase: ListSalaryAdvancesUseCase,
    private observeUseCase: ObserveSalaryAdvancesUseCase
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
