import { IPartnerRepository } from '../../domain/repositories/IPartnerRepository';

export class PartnerGateway {
  constructor(private repository: IPartnerRepository) {}

  async getPartners(companyId: string): Promise<any[]> {
    return this.repository.getPartners(companyId);
  }

  async getPartnerById(companyId: string, id: string): Promise<any | null> {
    return this.repository.getPartnerById(companyId, id);
  }

  async createPartner(companyId: string, partner: any): Promise<string> {
    return this.repository.createPartner(companyId, partner);
  }

  async updatePartner(companyId: string, id: string, data: any): Promise<void> {
    return this.repository.updatePartner(companyId, id, data);
  }

  async deletePartner(companyId: string, id: string): Promise<void> {
    return this.repository.deletePartner(companyId, id);
  }

  observePartners(companyId: string, callback: (partners: any[]) => void): () => void {
    return this.repository.observePartners(companyId, callback);
  }
}
