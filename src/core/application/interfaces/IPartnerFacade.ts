export interface IPartnerFacade {
  createPartner(companyId: string, partner: any): Promise<string>;
  updatePartner(companyId: string, id: string, data: any): Promise<void>;
  deletePartner(companyId: string, id: string): Promise<void>;
  getPartner(companyId: string, id: string): Promise<any>;
  listPartners(companyId: string): Promise<any[]>;
  observePartners(companyId: string, callback: (partners: any[]) => void): () => void;
}
