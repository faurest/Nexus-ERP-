import { IServiceFacade } from '../interfaces/IServiceFacade';
import { CreateServiceUseCase } from '../usecases/services/CreateServiceUseCase';
import { UpdateServiceUseCase } from '../usecases/services/UpdateServiceUseCase';
import { DeleteServiceUseCase } from '../usecases/services/DeleteServiceUseCase';
import { GetServiceUseCase } from '../usecases/services/GetServiceUseCase';
import { ListServicesUseCase } from '../usecases/services/ListServicesUseCase';
import { ObserveServicesUseCase } from '../usecases/services/ObserveServicesUseCase';

export class ServiceFacade implements IServiceFacade {
  constructor(
    private createUseCase: CreateServiceUseCase,
    private updateUseCase: UpdateServiceUseCase,
    private deleteUseCase: DeleteServiceUseCase,
    private getUseCase: GetServiceUseCase,
    private listUseCase: ListServicesUseCase,
    private observeUseCase: ObserveServicesUseCase
  ) {}

  async createService(companyId: string, data: any): Promise<string> {
    return this.createUseCase.execute(companyId, data);
  }
  async updateService(companyId: string, id: string, data: any): Promise<void> {
    return this.updateUseCase.execute(companyId, id, data);
  }
  async deleteService(companyId: string, id: string): Promise<void> {
    return this.deleteUseCase.execute(companyId, id);
  }
  async getService(companyId: string, id: string): Promise<any> {
    return this.getUseCase.execute(companyId, id);
  }
  async listServices(companyId: string): Promise<any[]> {
    return this.listUseCase.execute(companyId);
  }
  observeServices(companyId: string, callback: (items: any[]) => void): () => void {
    return this.observeUseCase.execute(companyId, callback);
  }
}
