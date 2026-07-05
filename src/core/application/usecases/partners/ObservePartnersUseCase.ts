import { PartnerGateway } from '../../../infrastructure/gateways/PartnerGateway';

export class ObservePartnersUseCase {
  constructor(private gateway: PartnerGateway) {}

  execute(companyId: string, callback: (partners: any[]) => void): () => void {
    return this.gateway.observePartners(companyId, callback);
  }
}
