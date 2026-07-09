import { ILeaveRequestRepository } from '../../../domain/repositories/ILeaveRequestRepository';
export class ObserveLeaveRequestsUseCase {
  constructor(private repository: ILeaveRequestRepository) {}
  execute(companyId: string, callback: (items: any[]) => void): () => void { return this.repository.observe(companyId, callback); }
}
