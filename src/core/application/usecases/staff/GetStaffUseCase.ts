import { IStaffRepository } from '../../../domain/repositories/IStaffRepository';

export class GetStaffUseCase {
  constructor(private repository: IStaffRepository) {}
  async execute(id: string): Promise<any> {
    return this.repository.getStaffById(id);
  }
}
