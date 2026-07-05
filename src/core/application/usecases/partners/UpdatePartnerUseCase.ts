import { PartnerGateway } from '../../../infrastructure/gateways/PartnerGateway';

export class UpdatePartnerUseCase {
  constructor(private gateway: PartnerGateway) {}

  async execute(companyId: string, id: string, data: any): Promise<void> {
    return this.gateway.updatePartner(companyId, id, data);
  }
}
