import { PartnerGateway } from '../../../infrastructure/gateways/PartnerGateway';

export class GetPartnerUseCase {
  constructor(private gateway: PartnerGateway) {}

  async execute(companyId: string, id: string): Promise<any> {
    return this.gateway.getPartnerById(companyId, id);
  }
}
