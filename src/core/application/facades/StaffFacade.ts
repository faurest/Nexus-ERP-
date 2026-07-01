import { IStaffFacade } from '../interfaces/IStaffFacade';

export class StaffFacade implements IStaffFacade {
  constructor(
    private createStaffUseCase: any,
    private updateStaffUseCase: any,
    private deleteStaffUseCase: any,
    private getStaffUseCase: any,
    private listStaffUseCase: any,
    private observeStaffUseCase: any
  ) {}

  async createStaff(staff: any): Promise<string> {
    return this.createStaffUseCase.execute(staff);
  }

  async updateStaff(id: string, data: any): Promise<void> {
    return this.updateStaffUseCase.execute(id, data);
  }

  async deleteStaff(id: string): Promise<void> {
    return this.deleteStaffUseCase.execute(id);
  }

  async getStaff(id: string): Promise<any> {
    return this.getStaffUseCase.execute(id);
  }

  async listStaff(companyId: string): Promise<any[]> {
    return this.listStaffUseCase.execute(companyId);
  }

  observeStaff(companyId: string, callback: (staff: any[]) => void): () => void {
    return this.observeStaffUseCase.execute(companyId, callback);
  }
}
