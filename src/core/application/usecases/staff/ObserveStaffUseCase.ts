import { IStaffRepository } from '../../../domain/repositories/IStaffRepository';

export class ObserveStaffUseCase {
  constructor(private repository: IStaffRepository) {}
  execute(companyId: string, callback: (data: any[]) => void): () => void {
    return this.repository.subscribeToStaff(companyId, callback);
  }
}
