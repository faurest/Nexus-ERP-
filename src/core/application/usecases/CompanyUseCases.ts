import { ICompanyRepository } from '../../domain/repositories/ICompanyRepository';
import { RepositoryException } from '../exceptions/AppException';

export class CompanyUseCases {
  constructor(private companyRepository: ICompanyRepository) {}

  async getCompanies() {
    try {
      return await this.companyRepository.getCompanies();
    } catch (error) {
      throw new RepositoryException('Failed to get companies', error);
    }
  }

  async getCompanyById(id: string) {
    try {
      return await this.companyRepository.getCompanyById(id);
    } catch (error) {
      throw new RepositoryException(`Failed to get company ${id}`, error);
    }
  }

  async createCompany(company: any) {
    try {
      return await this.companyRepository.createCompany(company);
    } catch (error) {
      throw new RepositoryException('Failed to create company', error);
    }
  }

  async updateCompany(id: string, data: any) {
    try {
      await this.companyRepository.updateCompany(id, data);
    } catch (error) {
      throw new RepositoryException(`Failed to update company ${id}`, error);
    }
  }

  async deleteCompany(id: string) {
    try {
      await this.companyRepository.deleteCompany(id);
    } catch (error) {
      throw new RepositoryException(`Failed to delete company ${id}`, error);
    }
  }

  subscribeToCompanies(callback: (companies: any[]) => void) {
    return this.companyRepository.subscribeToCompanies(callback);
  }
}
