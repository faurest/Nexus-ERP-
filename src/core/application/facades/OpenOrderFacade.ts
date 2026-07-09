import { IOpenOrderFacade } from '../interfaces/IOpenOrderFacade';
import { CreateOpenOrderUseCase } from '../usecases/open_orders/CreateOpenOrderUseCase';
import { UpdateOpenOrderUseCase } from '../usecases/open_orders/UpdateOpenOrderUseCase';
import { DeleteOpenOrderUseCase } from '../usecases/open_orders/DeleteOpenOrderUseCase';
import { GetOpenOrderUseCase } from '../usecases/open_orders/GetOpenOrderUseCase';
import { ListOpenOrdersUseCase } from '../usecases/open_orders/ListOpenOrdersUseCase';
import { ObserveOpenOrdersUseCase } from '../usecases/open_orders/ObserveOpenOrdersUseCase';

export class OpenOrderFacade implements IOpenOrderFacade {
  constructor(
    private createUseCase: CreateOpenOrderUseCase,
    private updateUseCase: UpdateOpenOrderUseCase,
    private deleteUseCase: DeleteOpenOrderUseCase,
    private getUseCase: GetOpenOrderUseCase,
    private listUseCase: ListOpenOrdersUseCase,
    private observeUseCase: ObserveOpenOrdersUseCase
  ) {}

  async createOpenOrder(companyId: string, data: any): Promise<string> {
    return this.createUseCase.execute(companyId, data);
  }
  async updateOpenOrder(companyId: string, id: string, data: any): Promise<void> {
    return this.updateUseCase.execute(companyId, id, data);
  }
  async deleteOpenOrder(companyId: string, id: string): Promise<void> {
    return this.deleteUseCase.execute(companyId, id);
  }
  async getOpenOrder(companyId: string, id: string): Promise<any> {
    return this.getUseCase.execute(companyId, id);
  }
  async listOpenOrders(companyId: string): Promise<any[]> {
    return this.listUseCase.execute(companyId);
  }
  observeOpenOrders(companyId: string, callback: (items: any[]) => void): () => void {
    return this.observeUseCase.execute(companyId, callback);
  }
}
