export interface ICompanyRepository {
  getCompanies(): Promise<any[]>;
  getCompanyById(id: string): Promise<any | null>;
  createCompany(company: any): Promise<string>;
  updateCompany(id: string, data: any): Promise<void>;
  deleteCompany(id: string): Promise<void>;
  subscribeToCompanies(callback: (companies: any[]) => void): () => void;
  observeUserCompanies(userId: string, callback: (companies: any[]) => void): () => void;
}
