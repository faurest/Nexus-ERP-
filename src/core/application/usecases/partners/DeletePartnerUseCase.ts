import { PartnerGateway } from '../../../infrastructure/gateways/PartnerGateway';

export class DeletePartnerUseCase {
  constructor(private gateway: PartnerGateway) {}

  async execute(companyId: string, id: string): Promise<void> {
    return this.gateway.deletePartner(companyId, id);
  }
}
