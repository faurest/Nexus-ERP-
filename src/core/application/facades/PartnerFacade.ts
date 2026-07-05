import { IPartnerFacade } from '../interfaces/IPartnerFacade';
import { CreatePartnerUseCase } from '../usecases/partners/CreatePartnerUseCase';
import { UpdatePartnerUseCase } from '../usecases/partners/UpdatePartnerUseCase';
import { DeletePartnerUseCase } from '../usecases/partners/DeletePartnerUseCase';
import { GetPartnerUseCase } from '../usecases/partners/GetPartnerUseCase';
import { ListPartnersUseCase } from '../usecases/partners/ListPartnersUseCase';
import { ObservePartnersUseCase } from '../usecases/partners/ObservePartnersUseCase';

export class PartnerFacade implements IPartnerFacade {
  constructor(
    private createPartnerUseCase: CreatePartnerUseCase,
    private updatePartnerUseCase: UpdatePartnerUseCase,
    private deletePartnerUseCase: DeletePartnerUseCase,
    private getPartnerUseCase: GetPartnerUseCase,
    private listPartnersUseCase: ListPartnersUseCase,
    private observePartnersUseCase: ObservePartnersUseCase
  ) {}

  async createPartner(companyId: string, partner: any): Promise<string> {
    return this.createPartnerUseCase.execute(companyId, partner);
  }

  async updatePartner(companyId: string, id: string, data: any): Promise<void> {
    return this.updatePartnerUseCase.execute(companyId, id, data);
  }

  async deletePartner(companyId: string, id: string): Promise<void> {
    return this.deletePartnerUseCase.execute(companyId, id);
  }

  async getPartner(companyId: string, id: string): Promise<any> {
    return this.getPartnerUseCase.execute(companyId, id);
  }

  async listPartners(companyId: string): Promise<any[]> {
    return this.listPartnersUseCase.execute(companyId);
  }

  observePartners(companyId: string, callback: (partners: any[]) => void): () => void {
    return this.observePartnersUseCase.execute(companyId, callback);
  }
}
