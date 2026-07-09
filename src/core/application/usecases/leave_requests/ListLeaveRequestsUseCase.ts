import { ILeaveRequestRepository } from '../../../domain/repositories/ILeaveRequestRepository';
export class ListLeaveRequestsUseCase {
  constructor(private repository: ILeaveRequestRepository) {}
  async execute(companyId: string): Promise<any[]> { return this.repository.list(companyId); }
}
