import { PartnerGateway } from '../../../infrastructure/gateways/PartnerGateway';

export class CreatePartnerUseCase {
  constructor(private gateway: PartnerGateway) {}

  async execute(companyId: string, partner: any): Promise<string> {
    return this.gateway.createPartner(companyId, partner);
  }
}
