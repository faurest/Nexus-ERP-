import { ILeaveRequestRepository } from '../../../domain/repositories/ILeaveRequestRepository';
export class UpdateLeaveRequestUseCase {
  constructor(private repository: ILeaveRequestRepository) {}
  async execute(id: string, data: any): Promise<void> { return this.repository.update(id, data); }
}
