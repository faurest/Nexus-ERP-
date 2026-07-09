import { ISaleFacade } from '../interfaces/ISaleFacade';
import { CreateSaleUseCase } from '../usecases/sales/CreateSaleUseCase';
import { UpdateSaleUseCase } from '../usecases/sales/UpdateSaleUseCase';
import { DeleteSaleUseCase } from '../usecases/sales/DeleteSaleUseCase';
import { GetSaleUseCase } from '../usecases/sales/GetSaleUseCase';
import { ListSalesUseCase } from '../usecases/sales/ListSalesUseCase';
import { ObserveSalesUseCase } from '../usecases/sales/ObserveSalesUseCase';

export class SaleFacade implements ISaleFacade {
  constructor(
    private createUseCase: CreateSaleUseCase,
    private updateUseCase: UpdateSaleUseCase,
    private deleteUseCase: DeleteSaleUseCase,
    private getUseCase: GetSaleUseCase,
    private listUseCase: ListSalesUseCase,
    private observeUseCase: ObserveSalesUseCase
  ) {}

  async createSale(companyId: string, data: any): Promise<string> {
    return this.createUseCase.execute(companyId, data);
  }
  async updateSale(companyId: string, id: string, data: any): Promise<void> {
    return this.updateUseCase.execute(companyId, id, data);
  }
  async deleteSale(companyId: string, id: string): Promise<void> {
    return this.deleteUseCase.execute(companyId, id);
  }
  async getSale(companyId: string, id: string): Promise<any> {
    return this.getUseCase.execute(companyId, id);
  }
  async listSales(companyId: string): Promise<any[]> {
    return this.listUseCase.execute(companyId);
  }
  observeSales(companyId: string, callback: (items: any[]) => void): () => void {
    return this.observeUseCase.execute(companyId, callback);
  }
}
