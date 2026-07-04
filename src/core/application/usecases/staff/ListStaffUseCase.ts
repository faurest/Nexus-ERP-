import { IStaffRepository } from '../../../domain/repositories/IStaffRepository';

export class ListStaffUseCase {
  constructor(private repository: IStaffRepository) {}
  async execute(companyId: string): Promise<any[]> {
    return this.repository.getStaff(companyId);
  }
}
