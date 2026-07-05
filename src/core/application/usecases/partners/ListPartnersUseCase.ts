import { PartnerGateway } from '../../../infrastructure/gateways/PartnerGateway';

export class ListPartnersUseCase {
  constructor(private gateway: PartnerGateway) {}

  async execute(companyId: string): Promise<any[]> {
    return this.gateway.getPartners(companyId);
  }
}
