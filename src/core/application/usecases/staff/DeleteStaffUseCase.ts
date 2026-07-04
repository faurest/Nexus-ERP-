import { IStaffRepository } from '../../../domain/repositories/IStaffRepository';

export class DeleteStaffUseCase {
  constructor(private repository: IStaffRepository) {}
  async execute(id: string): Promise<void> {
    return this.repository.deleteStaff(id);
  }
}
