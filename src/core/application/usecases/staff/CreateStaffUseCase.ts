import { IStaffRepository } from '../../../domain/repositories/IStaffRepository';

export class CreateStaffUseCase {
  constructor(private repository: IStaffRepository) {}
  async execute(data: any): Promise<string> {
    return this.repository.createStaff(data);
  }
}
