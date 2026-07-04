export interface ICompanyFacade {
  createCompany(company: any): Promise<string>;
  updateCompany(id: string, data: any): Promise<void>;
  deleteCompany(id: string): Promise<void>;
  getCompany(id: string): Promise<any>;
  listCompanies(): Promise<any[]>;
  observeCompanies(callback: (companies: any[]) => void): () => void;
  observeUserCompanies(userId: string, callback: (companies: any[]) => void): () => void;
}
