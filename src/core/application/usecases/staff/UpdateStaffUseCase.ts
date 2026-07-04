import { IStaffRepository } from '../../../domain/repositories/IStaffRepository';

export class UpdateStaffUseCase {
  constructor(private repository: IStaffRepository) {}
  async execute(id: string, data: any): Promise<void> {
    return this.repository.updateStaff(id, data);
  }
}
