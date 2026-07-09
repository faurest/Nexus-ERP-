import { IResourceFacade } from '../interfaces/IResourceFacade';
import { CreateResourceUseCase } from '../usecases/resources/CreateResourceUseCase';
import { UpdateResourceUseCase } from '../usecases/resources/UpdateResourceUseCase';
import { DeleteResourceUseCase } from '../usecases/resources/DeleteResourceUseCase';
import { GetResourceUseCase } from '../usecases/resources/GetResourceUseCase';
import { ListResourcesUseCase } from '../usecases/resources/ListResourcesUseCase';
import { ObserveResourcesUseCase } from '../usecases/resources/ObserveResourcesUseCase';

export class ResourceFacade implements IResourceFacade {
  constructor(
    private createUseCase: CreateResourceUseCase,
    private updateUseCase: UpdateResourceUseCase,
    private deleteUseCase: DeleteResourceUseCase,
    private getUseCase: GetResourceUseCase,
    private listUseCase: ListResourcesUseCase,
    private observeUseCase: ObserveResourcesUseCase
  ) {}

  async createResource(companyId: string, data: any): Promise<string> {
    return this.createUseCase.execute(companyId, data);
  }
  async updateResource(companyId: string, id: string, data: any): Promise<void> {
    return this.updateUseCase.execute(companyId, id, data);
  }
  async deleteResource(companyId: string, id: string): Promise<void> {
    return this.deleteUseCase.execute(companyId, id);
  }
  async getResource(companyId: string, id: string): Promise<any> {
    return this.getUseCase.execute(companyId, id);
  }
  async listResources(companyId: string): Promise<any[]> {
    return this.listUseCase.execute(companyId);
  }
  observeResources(companyId: string, callback: (items: any[]) => void): () => void {
    return this.observeUseCase.execute(companyId, callback);
  }
}
