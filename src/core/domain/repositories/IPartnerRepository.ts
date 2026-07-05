export interface IPartnerRepository {
  getPartners(companyId: string): Promise<any[]>;
  getPartnerById(companyId: string, id: string): Promise<any | null>;
  createPartner(companyId: string, partner: any): Promise<string>;
  updatePartner(companyId: string, id: string, data: any): Promise<void>;
  deletePartner(companyId: string, id: string): Promise<void>;
  observePartners(companyId: string, callback: (partners: any[]) => void): () => void;
}
