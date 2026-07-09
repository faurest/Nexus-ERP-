import { AddCompanyMemberEmailUseCase } from '../usecases/company/AddCompanyMemberEmailUseCase';
import { ICompanyFacade } from '../interfaces/ICompanyFacade';

export class CompanyFacade implements ICompanyFacade {
  constructor(
    private createCompanyUseCase: any,
    private updateCompanyUseCase: any,
    private deleteCompanyUseCase: any,
    private getCompanyUseCase: any,
    private listCompaniesUseCase: any,
    private observeCompaniesUseCase: any,
    private addCompanyMemberEmailUseCase: AddCompanyMemberEmailUseCase
  ) {}

  async createCompany(company: any): Promise<string> {
    return this.createCompanyUseCase.execute(company);
  }

  async updateCompany(id: string, data: any): Promise<void> {
    return this.updateCompanyUseCase.execute(id, data);
  }

  async deleteCompany(id: string): Promise<void> {
    return this.deleteCompanyUseCase.execute(id);
  }

  async getCompany(id: string): Promise<any> {
    return this.getCompanyUseCase.execute(id);
  }

  async listCompanies(): Promise<any[]> {
    return this.listCompaniesUseCase.execute();
  }

  observeCompanies(callback: (companies: any[]) => void): () => void {
    return this.observeCompaniesUseCase.execute(callback);
  }

  observeUserCompanies(userId: string, callback: (companies: any[]) => void): () => void {
    return this.observeCompaniesUseCase.executeForUser(userId, callback);
  }

  async addMemberEmail(companyId: string, email: string): Promise<void> {
    return this.addCompanyMemberEmailUseCase.execute(companyId, email);
  }
}
