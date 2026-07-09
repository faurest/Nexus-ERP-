import { ILeaveRequestRepository } from '../../../domain/repositories/ILeaveRequestRepository';
export class GetLeaveRequestUseCase {
  constructor(private repository: ILeaveRequestRepository) {}
  async execute(id: string): Promise<any> { return this.repository.getById(id); }
}
