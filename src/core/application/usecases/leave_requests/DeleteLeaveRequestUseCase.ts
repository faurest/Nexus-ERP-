import { ILeaveRequestRepository } from '../../../domain/repositories/ILeaveRequestRepository';
export class DeleteLeaveRequestUseCase {
  constructor(private repository: ILeaveRequestRepository) {}
  async execute(id: string): Promise<void> { return this.repository.delete(id); }
}
